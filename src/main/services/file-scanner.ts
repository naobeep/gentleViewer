import fs from 'fs';
import path from 'path';
const BetterSqlite3 = require('better-sqlite3');
const crypto = require('crypto');

interface FileRecord {
  id: string;
  path: string;
  name: string;
  size?: number | null;
  created_at: number;
  updated_at: number;
}

/**
 * シンプルなファイルスキャナ。
 * - 非同期でディレクトリを走査（再帰オプションあり）
 * - 見つかったファイルの基本メタを DB に upsert する
 *
 * 注意: 大規模フォルダ向けにはストリーム／バッチ化／除外ルールを追加してください。
 */
export async function scanFolder(dir: string, options?: { recursive?: boolean }) {
  const recursive = !!options?.recursive;
  const results: { path: string; name: string; size?: number }[] = [];

  async function walk(current: string) {
    let entries: string[];
    try {
      entries = await fs.promises.readdir(current);
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(current, e);
      let stat: fs.Stats;
      try {
        stat = await fs.promises.stat(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (recursive) await walk(full);
      } else if (stat.isFile()) {
        results.push({ path: full, name: path.basename(full), size: stat.size });
        try {
          // DB に upsert（軽量）
          upsertFile({ path: full, name: path.basename(full), size: stat.size });
        } catch (e) {
          // ignore DB エラー（ログは main で確認可能）
          console.error('[scanner] upsertFile failed', e);
        }
      }
    }
  }

  await walk(dir);
  return results;
}

function db() {
  // シングルトンで DB を保持（プロセス全体でひとつの接続）
  const globalKey = '__gentleViewer_db__' as any;
  if ((global as any)[globalKey]) return (global as any)[globalKey];

  // commonjs で動的に読み込む（TypeScript 設定に依存せず実行できるように）
  // パッケージがインストールされていることが前提: better-sqlite3
  const dbPath = path.join(process.cwd(), 'gentleViewer.sqlite');

  const instance = new BetterSqlite3(dbPath);
  // 軽めのパフォーマンスチューニング
  try {
    instance.pragma('journal_mode = WAL');
    instance.pragma('synchronous = NORMAL');
  } catch {
    // 無視
  }

  // テーブルが無ければ作成
  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS files (
         id TEXT PRIMARY KEY,
         path TEXT UNIQUE NOT NULL,
         name TEXT NOT NULL,
         size INTEGER,
         created_at INTEGER NOT NULL,
         updated_at INTEGER NOT NULL
       )`
    )
    .run();

  (global as any)[globalKey] = instance;
  return instance;
}
function upsertFile(file: { path: string; name: string; size?: number | null }): FileRecord {
  const instance = db();
  const id = crypto.createHash('sha256').update(file.path).digest('hex');
  const now = Date.now();

  const txn = instance.transaction((f: { path: string; name: string; size?: number | null }) => {
    const update = instance.prepare(
      `UPDATE files SET name = @name, size = @size, updated_at = @updated_at WHERE path = @path`
    );
    const info = update.run({ name: f.name, size: f.size ?? null, updated_at: now, path: f.path });

    if (info.changes === 0) {
      const insert = instance.prepare(
        `INSERT INTO files (id, path, name, size, created_at, updated_at)
         VALUES (@id, @path, @name, @size, @created_at, @updated_at)`
      );
      insert.run({
        id,
        path: f.path,
        name: f.name,
        size: f.size ?? null,
        created_at: now,
        updated_at: now,
      });
      return {
        id,
        path: f.path,
        name: f.name,
        size: f.size ?? null,
        created_at: now,
        updated_at: now,
      } as FileRecord;
    }

    const row = instance.prepare(`SELECT * FROM files WHERE path = ?`).get(f.path) as
      | FileRecord
      | undefined;
    if (row) return row;

    // Fallback (shouldn't normally happen)
    return {
      id,
      path: f.path,
      name: f.name,
      size: f.size ?? null,
      created_at: now,
      updated_at: now,
    } as FileRecord;
  });

  return txn(file);
}

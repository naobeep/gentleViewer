import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { app } from 'electron';

let db: Database.Database | null = null;

export function initDb() {
  if (db) return db;
  const dataDir = app.getPath('userData');
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  } catch {}
  const dbPath = path.join(dataDir, 'gentleviewer.sqlite3');
  try {
    console.info('[db] database path:', dbPath);
  } catch {}
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function runMigrationSql(sql: string) {
  const d = initDb();
  d.exec(sql);
}

/**
 * ディレクトリ内のマイグレーションを順次実行する。
 * ファイル名をバージョンとして migrations テーブルに記録する。
 * 提案する命名規則: 001_name.sql, 002_add_table.sql ...
 */
export function runAllMigrations(migrationsDir: string): string[] {
  const d = initDb();

  // ensure migrations table
  d.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  // dev-friendly: check alternate src location if dist is not present
  const candidates = [
    migrationsDir,
    path.join(process.cwd(), 'dist', 'migrations'),
    path.join(process.cwd(), 'src', 'main', 'migrations'),
    path.join(process.cwd(), 'src', 'migrations'),
    path.join(__dirname, '../migrations'),
  ].filter(Boolean);

  console.info('runAllMigrations: checking candidates:', candidates);

  let usedDir: string | null = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      usedDir = c;
      break;
    }
  }

  if (!usedDir) {
    console.info('migrations dir not found, skipping. checked:', candidates);
    return [];
  }

  console.info('runAllMigrations: using migrations dir:', usedDir);

  const files = fs
    .readdirSync(usedDir)
    .filter(f => f.toLowerCase().endsWith('.sql'))
    .sort();

  const appliedStmt = d.prepare('SELECT 1 FROM migrations WHERE id = ?');
  const insertStmt = d.prepare('INSERT INTO migrations (id, applied_at) VALUES (?, ?)');

  const applied: string[] = [];

  for (const file of files) {
    try {
      const id = file;
      const already = appliedStmt.get(id);
      if (already) continue;

      const filePath = path.join(usedDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // SQL に BEGIN/COMMIT（または BEGIN TRANSACTION）が含まれているかを検出します。
      // 注意: ここでは正規表現に単一のバックスラッシュを使います（\b は単語境界）。
      const hasTx = /\bBEGIN\b|\bCOMMIT\b|\bBEGIN TRANSACTION\b/i.test(sql);

      if (hasTx) {
        d.exec(sql);
        insertStmt.run(id, Date.now());
      } else {
        // SQL 自体にトランザクションが含まれない場合はトランザクションで実行して安全に記録する
        const runTx = d.transaction((s: string) => {
          d.exec(s);
          insertStmt.run(id, Date.now());
        });
        runTx(sql);
      }

      console.info('migration applied:', filePath);
      applied.push(file);
    } catch (e) {
      console.error('migration failed for', file, e);
      throw e;
    }
  }

  return applied;
}

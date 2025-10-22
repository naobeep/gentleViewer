import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { app } from 'electron';

/**
 * マイグレーションディレクトリの決定:
 * - packaged: process.resourcesPath + /resources/migrations
 * - development: app.getAppPath() + /src/main/migrations または /resources/migrations を探す
 */
function resolveMigrationsDir(): string | null {
  const candidates: string[] = [];
  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, 'resources', 'migrations'));
  } else {
    // 開発時はプロジェクト内のいくつかの候補を探す
    const appPath = app.getAppPath();
    candidates.push(path.join(appPath, 'resources', 'migrations'));
    candidates.push(path.join(appPath, 'src', 'main', 'migrations'));
    candidates.push(path.join(appPath, 'src', 'migrations'));
  }
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export async function runMigrations(dbPath: string) {
  const migrationsDir = resolveMigrationsDir();
  if (!migrationsDir) {
    console.warn('migrations dir not found (checked candidates). Skipping migrations.');
    return;
  }

  const db = new Database(dbPath);
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
    `);

    const appliedStmt = db.prepare('SELECT name FROM migrations');
    const applied = new Set(appliedStmt.all().map((r: any) => r.name));

    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      try {
        db.exec('BEGIN');
        db.exec(sql);
        const insert = db.prepare('INSERT INTO migrations(name, applied_at) VALUES(?, ?)');
        insert.run(file, new Date().toISOString());
        db.exec('COMMIT');
        console.log('migration applied:', file);
      } catch (e) {
        db.exec('ROLLBACK');
        console.error('migration failed:', file, e);
        throw e;
      }
    }
  } finally {
    db.close();
  }
}

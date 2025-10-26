import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

export async function applyMigrations(dbFile: string, migrationsDir: string) {
  await fs.promises.mkdir(path.dirname(dbFile), { recursive: true });
  const db = new sqlite3.Database(dbFile);
  const run = (sql: string) =>
    new Promise<void>((resolve, reject) => {
      db.exec(sql, err => (err ? reject(err) : resolve()));
    });

  const allMigs = (await fs.promises.readdir(migrationsDir))
    .filter(f => f.match(/^\d+.*\.sql$/))
    .sort();

  // ensure schema_migrations exists so we can check
  await run(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);'
  );

  for (const m of allMigs) {
    const version = m;
    const checkSql = `SELECT 1 FROM schema_migrations WHERE version = '${version}' LIMIT 1;`;
    const applied = await new Promise<boolean>((resolve, reject) => {
      db.get(checkSql, (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      });
    });
    if (applied) continue;
    const sql = await fs.promises.readFile(path.join(migrationsDir, m), 'utf8');
    await run('BEGIN;');
    try {
      await run(sql);
      await run(
        `INSERT INTO schema_migrations(version, applied_at) VALUES('${version}', strftime('%s','now'));`
      );
      await run('COMMIT;');
      console.info(`[migrate] applied ${m}`);
    } catch (e) {
      await run('ROLLBACK;');
      console.error(`[migrate] failed ${m}`, e);
      throw e;
    }
  }

  db.close();
}

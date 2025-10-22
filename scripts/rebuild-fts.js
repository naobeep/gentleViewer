// 使い方: node .\scripts\rebuild-fts.js "path\to\gentle-viewer.sqlite3"
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = process.argv[2];
if (!dbPath) {
  console.error('Usage: node rebuild-fts.js <dbPath>');
  process.exit(2);
}
if (!fs.existsSync(dbPath)) {
  console.error('DB not found:', dbPath);
  process.exit(3);
}

const db = new Database(dbPath);
try {
  console.log('Rebuilding FTS index...');
  // 初回同期（files.content を FTS にコピー）
  db.exec('BEGIN');
  db.exec(
    'INSERT INTO file_content_fts(rowid, content) SELECT id, content FROM files WHERE id NOT IN (SELECT rowid FROM file_content_fts);'
  );
  db.exec('COMMIT');
  console.log('FTS rebuild finished');
} catch (e) {
  db.exec('ROLLBACK');
  console.error('FTS rebuild failed', e);
  process.exit(4);
} finally {
  db.close();
}

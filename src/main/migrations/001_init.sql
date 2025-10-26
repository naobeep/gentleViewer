-- 初期スキーマ（files / tags / file_tags） + FTS5 インデックスとトリガ
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  name TEXT,
  size INTEGER,
  mtime INTEGER,
  thumbnailPath TEXT,
  addedAt INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT
);

CREATE TABLE IF NOT EXISTS file_tags (
  file_id INTEGER NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (file_id, tag_id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- FTS5: files テーブルの name/path を全文検索可能にする
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  name,
  path,
  content='files',
  content_rowid='id'
);

-- トリガで FTS を同期（INSERT/DELETE/UPDATE）
CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
  INSERT INTO files_fts(rowid, name, path) VALUES (new.id, new.name, new.path);
END;
CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
  DELETE FROM files_fts WHERE rowid = old.id;
END;
CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
  UPDATE files_fts SET name = new.name, path = new.path WHERE rowid = new.id;
END;

-- マイグレーション管理テーブル
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

-- マイグレーション適用済みフラグ（初回適用時のみ）
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES('001_init', strftime('%s','now'));

-- FTS の初回構築（rebuild）
INSERT INTO files_fts(files_fts) VALUES('rebuild');

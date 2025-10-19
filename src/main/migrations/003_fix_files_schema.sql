BEGIN TRANSACTION;

-- 新しい正しいスキーマのテーブルを作成
CREATE TABLE IF NOT EXISTS files_new (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  extension TEXT,
  type TEXT,
  size INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);

-- 既存データの最低限の移行（存在する列のみコピー）
INSERT OR IGNORE INTO files_new (id, updated_at)
SELECT id, updated_at FROM files;

-- drop old and rename
DROP TABLE IF EXISTS files;
ALTER TABLE files_new RENAME TO files;

-- ensure FTS and triggers exist
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  path, name, tokenize='unicode61', content=''
);

CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
  INSERT OR REPLACE INTO files_fts(rowid, path, name) VALUES (new.rowid, new.path, new.name);
END;
CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
  INSERT OR REPLACE INTO files_fts(rowid, path, name) VALUES (new.rowid, new.path, new.name);
END;
CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
  DELETE FROM files_fts WHERE rowid = old.rowid;
END;

COMMIT;

-- 004: ensure files_fts exists and triggers (idempotent)
PRAGMA foreign_keys = ON;

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

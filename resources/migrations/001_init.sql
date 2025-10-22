-- 001_init.sql: 初期スキーマ + FTS5（ファイル本文） + 同期トリガー
PRAGMA foreign_keys = ON;

-- マイグレーション管理テーブル
CREATE TABLE IF NOT EXISTS migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- ファイル基本情報テーブル
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  size INTEGER,
  mime TEXT,
  created_at TEXT,
  updated_at TEXT,
  content TEXT
);

-- タグ関連
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT
);

CREATE TABLE IF NOT EXISTS file_tags (
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(file_id, tag_id)
);

-- FTS5 仮想テーブル（外部コンテンツ方式）
CREATE VIRTUAL TABLE IF NOT EXISTS file_content_fts USING fts5(
  content,
  content='files',
  content_rowid='id'
);

-- 安全のため既存トリガーを削除してから作り直す
DROP TRIGGER IF EXISTS files_ai;
DROP TRIGGER IF EXISTS files_ad;
DROP TRIGGER IF EXISTS files_au;

CREATE TRIGGER files_ai AFTER INSERT ON files BEGIN
  INSERT INTO file_content_fts(rowid, content) VALUES (new.id, new.content);
END;

CREATE TRIGGER files_ad AFTER DELETE ON files BEGIN
  DELETE FROM file_content_fts WHERE rowid = old.id;
END;

CREATE TRIGGER files_au AFTER UPDATE ON files BEGIN
  INSERT INTO file_content_fts(file_content_fts, rowid, content) VALUES('delete', old.id, old.content);
  INSERT INTO file_content_fts(rowid, content) VALUES (new.id, new.content);
END;

-- 既存データ同期が必要な場合:
-- INSERT INTO file_content_fts(rowid, content) SELECT id, content FROM files;

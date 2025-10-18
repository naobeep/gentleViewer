-- 初期スキーマ: files / tags / saved_searches

BEGIN TRANSACTION;

-- files テーブル（なければ作成）
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  extension TEXT,
  type TEXT,
  size INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);

-- tags テーブル
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  description TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- file_tags 中間テーブル
CREATE TABLE IF NOT EXISTS file_tags (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at INTEGER,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(file_id, tag_id)
);

-- FTS5 仮想テーブル（files の全文検索用、contentless）
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  path, name, tokenize='unicode61', content=''
);

-- マイグレーション適用記録テーブル
CREATE TABLE IF NOT EXISTS migrations (
  id TEXT PRIMARY KEY,
  applied_at INTEGER
);

COMMIT;

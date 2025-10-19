-- テスト用ダミー行（既存スキーマに合わせて最小限の列で挿入）
INSERT OR IGNORE INTO files (id, updated_at)
VALUES (
  'sample-1',
  strftime('%s','now')
);

-- テスト用: files に path/name を持つサンプルを追加
INSERT OR IGNORE INTO files (id, path, name, extension, type, size, created_at, updated_at)
VALUES (
  'sample-full-1',
  'C:\\\\Users\\\\naomu\\\\OneDrive\\\\デスクトップ\\\\gentleViewer\\\\test-files\\\\sample.pdf',
  'sample.pdf',
  '.pdf',
  'application/pdf',
  12345,
  strftime('%s','now'),
  strftime('%s','now')
);

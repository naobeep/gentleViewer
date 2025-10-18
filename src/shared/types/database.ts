// src/shared/types/database.ts

/**
 * データベーススキーマバージョン
 */
export interface SchemaVersion {
  version: number;
  applied_at: string;
  description: string;
}

/**
 * データベース統計
 */
export interface DatabaseStats {
  fileCount: number;
  tagCount: number;
  totalSize: number;
  databaseSize: number;
  lastOptimized?: string;
  lastBackup?: string;
}

/**
 * データベースバックアップ情報
 */
export interface BackupInfo {
  id: string;
  path: string;
  size: number;
  created_at: string;
  fileCount: number;
  tagCount: number;
}

/**
 * クエリ結果（ページネーション対応）
 */
export interface QueryResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

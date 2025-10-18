// src/shared/types/common.ts

/**
 * 共通的な型定義
 */

// ファイル形式
export type FileType = 'archive' | 'video' | 'pdf' | 'image' | 'audio' | 'unknown';

// ソート順
export type SortOrder = 'asc' | 'desc';

// ソートキー
export type SortKey =
  | 'name'
  | 'date'
  | 'size'
  | 'type'
  | 'imageCount'
  | 'duration'
  | 'pageCount';

// 表示モード
export type ViewMode = 'grid' | 'list' | 'detail';

// グリッドサイズ
export type GridSize = 'small' | 'medium' | 'large';

// 結果オブジェクト（エラーハンドリング用）
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ページネーション
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

// 日付範囲
export interface DateRange {
  start: Date;
  end: Date;
}

// サイズ範囲
export interface SizeRange {
  min: number;
  max: number;
}

// 時間範囲（秒）
export interface DurationRange {
  min: number;
  max: number;
}

// 進捗情報
export interface Progress {
  current: number;
  total: number;
  percentage: number;
  message?: string;
}

// 通知タイプ
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// 通知オブジェクト
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

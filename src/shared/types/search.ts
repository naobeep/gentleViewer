// src/shared/types/search.ts

import { FileType, SortKey, SortOrder, DateRange, SizeRange, DurationRange } from './common';
import { TagSelection } from './tag';

/**
 * 基本ファイル情報（SearchResult で使用）
 */
export interface FileInfo {
  id: number | string;
  filename: string;
  path?: string;
  size?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * 検索クエリ
 */
export interface SearchQuery {
  // テキスト検索
  filename?: string;
  regex?: boolean;

  // タグフィルター
  tags?: TagSelection;

  // ファイル形式フィルター
  fileTypes?: FileType[];
  extensions?: string[];

  // 属性フィルター
  dateRange?: DateRange;
  sizeRange?: SizeRange;
  durationRange?: DurationRange;

  // アーカイブ固有
  imageCountRange?: { min: number; max: number };

  // PDF固有
  pageCountRange?: { min: number; max: number };

  // 画像固有
  widthRange?: { min: number; max: number };
  heightRange?: { min: number; max: number };

  // お気に入り
  favorite?: boolean;

  // 可用性
  availableOnly?: boolean;

  // ソート
  sortBy?: SortKey;
  sortOrder?: SortOrder;

  // ページネーション
  limit?: number;
  offset?: number;
}

/**
 * 検索結果
 */
export interface SearchResult {
  files: FileInfo[];
  total: number;
  query: SearchQuery;
  duration: number; // ミリ秒
}

/**
 * 保存済み検索
 */
export interface SavedSearch {
  id: number;
  name: string;
  search_query: string; // JSON文字列
  is_favorite: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * スマート検索（動的条件）
 */
export interface SmartSearch extends SavedSearch {
  isDynamic: boolean; // 相対的な日付条件など
}

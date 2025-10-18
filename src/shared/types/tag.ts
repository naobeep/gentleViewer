// src/shared/types/tag.ts

/**
 * タグ情報
 */
export interface Tag {
  id: number;
  tag_name: string;
  color: string;
  icon?: string;
  parent_id?: number;
  description?: string;
  is_favorite: boolean;
  is_hidden: boolean;
  require_auth: boolean;
  sort_order: number;
  usage_count: number;
  created_at: string;
  updated_at: string;

  // リレーション（階層構造用）
  children?: Tag[];
  parent?: Tag;
}

/**
 * タグ作成パラメータ
 */
export interface CreateTagParams {
  tag_name: string;
  color?: string;
  icon?: string;
  parent_id?: number;
  description?: string;
  is_hidden?: boolean;
}

/**
 * タグ更新パラメータ
 */
export interface UpdateTagParams {
  tag_name?: string;
  color?: string;
  icon?: string;
  parent_id?: number;
  description?: string;
  is_favorite?: boolean;
  is_hidden?: boolean;
  require_auth?: boolean;
  sort_order?: number;
}

/**
 * タグ統計情報
 */
export interface TagStats {
  totalTags: number;
  favoriteTags: number;
  hiddenTags: number;
  unusedTags: number;
  averageUsage: number;
}

/**
 * タグフィルターモード
 */
export type TagFilterMode = 'and' | 'or' | 'not';

/**
 * タグ選択状態
 */
export interface TagSelection {
  include: number[]; // AND条件で含むタグ
  exclude: number[]; // NOT条件で除外するタグ
  any: number[]; // OR条件で含むタグ
  mode: TagFilterMode;
}

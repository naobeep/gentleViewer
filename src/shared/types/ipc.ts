// src/shared/types/ipc.ts

import { Progress } from './common';

/**
 * IPCチャンネル定義
 */
export const IPC_CHANNELS = {
  // ファイル操作
  SCAN_FILES: 'scan-files',
  GET_FILES: 'get-files',
  GET_FILE_BY_ID: 'get-file-by-id',
  REMOVE_FILE: 'remove-file',
  UPDATE_FILE: 'update-file',
  FILE_EXISTS: 'file-exists',
  GET_FILE_STATS: 'get-file-stats',
  READ_FILE: 'read-file',
  SHOW_IN_EXPLORER: 'show-in-explorer',
  OPEN_EXTERNAL: 'open-external',

  // アーカイブ操作
  READ_ARCHIVE: 'read-archive',
  EXTRACT_ARCHIVE_IMAGE: 'extract-archive-image',

  // 動画操作
  GET_VIDEO_METADATA: 'get-video-metadata',
  EXTRACT_EMBEDDED_SUBTITLE: 'extract-embedded-subtitle',

  // 音声操作
  GET_AUDIO_METADATA: 'get-audio-metadata',

  // PDF操作
  GET_PDF_METADATA: 'get-pdf-metadata',

  // 画像操作
  GET_IMAGE_EXIF: 'get-image-exif',

  // タグ操作
  GET_TAGS: 'get-tags',
  GET_TAG_BY_ID: 'get-tag-by-id',
  CREATE_TAG: 'create-tag',
  UPDATE_TAG: 'update-tag',
  DELETE_TAG: 'delete-tag',
  SEARCH_TAGS: 'search-tags',
  ADD_TAG_TO_FILE: 'add-tag-to-file',
  REMOVE_TAG_FROM_FILE: 'remove-tag-from-file',
  ADD_TAGS_TO_FILES: 'add-tags-to-files',

  // 検索操作
  SEARCH_FILES: 'search-files',
  GET_SAVED_SEARCHES: 'get-saved-searches',
  SAVE_SEARCH: 'save-search',
  DELETE_SAVED_SEARCH: 'delete-saved-search',

  // しおり操作
  GET_BOOKMARK: 'get-bookmark',
  SAVE_BOOKMARK: 'save-bookmark',
  DELETE_BOOKMARK: 'delete-bookmark',

  // チャプター操作
  GET_CHAPTERS: 'get-chapters',
  SAVE_CHAPTERS: 'save-chapters',

  // 設定操作
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  GET_SETTING: 'get-setting',
  SET_SETTING: 'set-setting',

  // データベース操作
  GET_DATABASE_STATS: 'get-database-stats',
  OPTIMIZE_DATABASE: 'optimize-database',
  BACKUP_DATABASE: 'backup-database',
  RESTORE_DATABASE: 'restore-database',

  // ダイアログ
  SHOW_OPEN_DIALOG: 'show-open-dialog',
  SHOW_SAVE_DIALOG: 'show-save-dialog',
  SHOW_MESSAGE_BOX: 'show-message-box',

  // スナップショット
  SAVE_SNAPSHOT: 'save-snapshot',

  // ファイル監視
  WATCH_FILES: 'watch-files',
  UNWATCH_FILES: 'unwatch-files',

  // イベント（メイン→レンダラー）
  FILE_CHANGED: 'file-changed',
  SCAN_PROGRESS: 'scan-progress',
  DATABASE_UPDATED: 'database-updated',
  SETTINGS_CHANGED: 'settings-changed',
} as const;

/**
 * スキャンオプション
 */
export interface ScanOptions {
  recursive: boolean;
  excludeHidden: boolean;
  minFileSize: number;
  skipDuplicates: boolean;
  extensionFilter: string[];
  autoTagging: boolean;
}

/**
 * ファイル変更イベント
 */
export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'rename';
  path: string;
  stats?: {
    size: number;
    mtime: Date;
  };
}

/**
 * スキャン結果
 */
export interface IpcScanResult {
  // 実装側で構造が異なる可能性があるため汎用的に型を許容します。
  [key: string]: any;
}

/**
 * スキャン進捗イベント
 */
export interface ScanProgressEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  progress?: Progress;
  result?: IpcScanResult;
  error?: string;
}

/**
 * ダイアログオプション
 */
export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: FileFilter[];
  properties?: Array<
    | 'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
  >;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: FileFilter[];
}

export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

export {};

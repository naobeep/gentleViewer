// src/shared/types/viewer.ts

/**
 * ビューワー共通型定義
 */

// ビューワータイプ
export type ViewerType = 'archive' | 'video' | 'pdf' | 'image' | 'audio';

// フィットモード
export type FitMode = 'fit-width' | 'fit-height' | 'fit-page' | 'fit-both' | 'original' | 'custom';

/**
 * アーカイブビューワー設定
 */
export interface ArchiveViewerState {
  currentPage: number;
  totalPages: number;
  viewMode: 'single' | 'spread' | 'continuous';
  readingDirection: 'rtl' | 'ltr';
  zoomLevel: number;
  fitMode: FitMode;
  rotation: number;
  isFullscreen: boolean;
  preloadPages: number;
}

/**
 * 動画ビューワー設定
 */
export interface VideoViewerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  subtitleTrack?: number;
  audioTrack?: number;
}

/**
 * PDFビューワー設定
 */
export interface PDFViewerState {
  currentPage: number;
  numPages: number;
  scale: number;
  rotation: number;
  viewMode: 'single' | 'double' | 'continuous';
  fitMode: FitMode;
  isFullscreen: boolean;
}

/**
 * 画像ビューワー設定
 */
export interface ImageViewerState {
  zoom: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  fitMode: FitMode;
  pan: { x: number; y: number };
  isFullscreen: boolean;
}

/**
 * 音声プレイヤー設定
 */
export interface AudioPlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  repeat: 'none' | 'one' | 'all';
  shuffle: boolean;
}

/**
 * しおり
 */
export interface Bookmark {
  id: number;
  file_id: number;
  page_number?: number;
  time_position?: number;
  total_pages?: number;
  total_duration?: number;
  zoom_level?: number;
  view_mode?: string;
  updated_at: string;
}

/**
 * チャプター（動画用）
 */
export interface Chapter {
  id: string;
  time: number;
  title: string;
  description?: string;
}

/**
 * プレイリスト
 */
export interface Playlist {
  id: string;
  name: string;
  files: number[]; // file_id の配列
  currentIndex: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
}

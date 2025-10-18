// src/shared/types/settings.ts

/**
 * アプリケーション設定
 */
export interface AppSettings {
  // 一般設定
  general: GeneralSettings;

  // プライバシー設定
  privacy: PrivacySettings;

  // ビューワー設定
  viewer: ViewerSettings;

  // パフォーマンス設定
  performance: PerformanceSettings;

  // 外観設定
  appearance: AppearanceSettings;
}

/**
 * 一般設定
 */
export interface GeneralSettings {
  language: string;
  startupBehavior: 'restore' | 'empty';
  defaultViewMode: 'grid' | 'list';
  defaultGridSize: 'small' | 'medium' | 'large';
  confirmOnDelete: boolean;
  confirmOnBulkOperation: boolean;
  autoSaveInterval: number; // ミリ秒
}

/**
 * プライバシー設定
 */
export interface PrivacySettings {
  // 認証
  requirePasswordOnStartup: boolean;
  autoLockEnabled: boolean;
  autoLockDelay: number; // ミリ秒
  lockOnMinimize: boolean;

  // ボスキー
  bossKeyEnabled: boolean;
  bossKeyShortcut: string;
  coverScreenType: 'blank' | 'excel' | 'vscode' | 'browser' | 'explorer' | 'custom';
  coverScreenPath?: string;
  muteSoundOnBossKey: boolean;
  clearHistoryOnBossKey: boolean;

  // 隠しタグ
  hiddenTagsEnabled: boolean;
  requireAuthForHiddenTags: boolean;

  // その他
  disableUsageStats: boolean;
  disableCrashReports: boolean;
}

/**
 * ビューワー設定
 */
export interface ViewerSettings {
  // アーカイブ
  archive: ArchiveViewerSettings;

  // 動画
  video: VideoViewerSettings;

  // PDF
  pdf: PDFViewerSettings;

  // 画像
  image: ImageViewerSettings;

  // 音声
  audio: AudioPlayerSettings;
}

export type FitMode = 'fit-width' | 'fit-height' | 'fit-both' | 'stretch' | 'original';

export interface ArchiveViewerSettings {
  defaultViewMode: 'single' | 'spread' | 'continuous';
  defaultReadingDirection: 'rtl' | 'ltr';
  defaultFitMode: FitMode;
  pageTransitionAnimation: boolean;
  animationType: 'slide' | 'fade' | 'none';
  preloadForward: number;
  preloadBackward: number;
  autoHideUI: boolean;
  autoHideDelay: number;
  rememberPosition: boolean;
  backgroundColor: string;
}

export interface VideoViewerSettings {
  autoPlay: boolean;
  defaultVolume: number;
  defaultPlaybackRate: number;
  rememberPosition: boolean;
  defaultSubtitleLanguage: string;
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleBackgroundColor: string;
  autoPlayNext: boolean;
  defaultRepeatMode: 'none' | 'one' | 'all';
  hardwareAcceleration: boolean;
}

export interface PDFViewerSettings {
  defaultViewMode: 'single' | 'double' | 'continuous';
  defaultFitMode: FitMode;
  rememberPosition: boolean;
  autoHideUI: boolean;
  autoHideDelay: number;
}

export interface ImageViewerSettings {
  defaultFitMode: FitMode;
  backgroundColor: string;
  smoothScaling: boolean;
  showExifByDefault: boolean;
}

export interface AudioPlayerSettings {
  defaultVolume: number;
  defaultPlaybackRate: number;
  rememberPosition: boolean;
  showVisualization: boolean;
  visualizationType: 'waveform' | 'spectrum' | 'none';
  crossfadeDuration: number;
}

/**
 * パフォーマンス設定
 */
export interface PerformanceSettings {
  maxConcurrentScans: number;
  thumbnailCacheSize: number; // バイト
  archiveCacheSize: number; // バイト
  databaseOptimizationInterval: number; // ミリ秒
  enableHardwareAcceleration: boolean;
  maxMemoryUsage: number; // バイト
}

/**
 * 外観設定
 */
export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  showThumbnails: boolean;
  thumbnailSize: number;
}

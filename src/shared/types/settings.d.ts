export interface AppSettings {
    general: GeneralSettings;
    privacy: PrivacySettings;
    viewer: ViewerSettings;
    performance: PerformanceSettings;
    appearance: AppearanceSettings;
}
export interface GeneralSettings {
    language: string;
    startupBehavior: 'restore' | 'empty';
    defaultViewMode: 'grid' | 'list';
    defaultGridSize: 'small' | 'medium' | 'large';
    confirmOnDelete: boolean;
    confirmOnBulkOperation: boolean;
    autoSaveInterval: number;
}
export interface PrivacySettings {
    requirePasswordOnStartup: boolean;
    autoLockEnabled: boolean;
    autoLockDelay: number;
    lockOnMinimize: boolean;
    bossKeyEnabled: boolean;
    bossKeyShortcut: string;
    coverScreenType: 'blank' | 'excel' | 'vscode' | 'browser' | 'explorer' | 'custom';
    coverScreenPath?: string;
    muteSoundOnBossKey: boolean;
    clearHistoryOnBossKey: boolean;
    hiddenTagsEnabled: boolean;
    requireAuthForHiddenTags: boolean;
    disableUsageStats: boolean;
    disableCrashReports: boolean;
}
export interface ViewerSettings {
    archive: ArchiveViewerSettings;
    video: VideoViewerSettings;
    pdf: PDFViewerSettings;
    image: ImageViewerSettings;
    audio: AudioPlayerSettings;
}
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
export interface PerformanceSettings {
    maxConcurrentScans: number;
    thumbnailCacheSize: number;
    archiveCacheSize: number;
    databaseOptimizationInterval: number;
    enableHardwareAcceleration: boolean;
    maxMemoryUsage: number;
}
export interface AppearanceSettings {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    showThumbnails: boolean;
    thumbnailSize: number;
}
//# sourceMappingURL=settings.d.ts.map
export type ViewerType = 'archive' | 'video' | 'pdf' | 'image' | 'audio';
export type FitMode = 'fit-width' | 'fit-height' | 'fit-page' | 'fit-both' | 'original' | 'custom';
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
export interface PDFViewerState {
    currentPage: number;
    numPages: number;
    scale: number;
    rotation: number;
    viewMode: 'single' | 'double' | 'continuous';
    fitMode: FitMode;
    isFullscreen: boolean;
}
export interface ImageViewerState {
    zoom: number;
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    fitMode: FitMode;
    pan: {
        x: number;
        y: number;
    };
    isFullscreen: boolean;
}
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
export interface Chapter {
    id: string;
    time: number;
    title: string;
    description?: string;
}
export interface Playlist {
    id: string;
    name: string;
    files: number[];
    currentIndex: number;
    shuffle: boolean;
    repeat: 'none' | 'one' | 'all';
}
//# sourceMappingURL=viewer.d.ts.map
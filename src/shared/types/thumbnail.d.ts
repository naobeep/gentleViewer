export interface ThumbnailGenerationProgress {
    total: number;
    completed: number;
    skipped: number;
    errors: number;
    currentFile: string | null;
    estimatedTimeRemaining: number | null;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
}
export interface ThumbnailError {
    filePath: string;
    fileName: string;
    error: string;
    timestamp: number;
}
export interface SearchQuery {
    tags: {
        include: number[];
        exclude: number[];
        any: number[];
    };
    fileTypes: string[];
    filename?: string;
    dateRange?: [string, string];
    sizeRange?: [number, number];
    archivePageRange?: [number, number];
    durationRange?: [number, number];
    resolutionMin?: {
        width: number;
        height: number;
    };
}
export interface SavedSearch {
    id: string;
    name: string;
    icon: string;
    query: SearchQuery;
    isFavorite: boolean;
    isPinned: boolean;
    createdAt: string;
    lastExecuted: string | null;
    executionCount: number;
}
//# sourceMappingURL=thumbnail.d.ts.map
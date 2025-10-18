export type FileType = 'archive' | 'video' | 'pdf' | 'image' | 'audio' | 'unknown';
export type SortOrder = 'asc' | 'desc';
export type SortKey = 'name' | 'date' | 'size' | 'type' | 'imageCount' | 'duration' | 'pageCount';
export type ViewMode = 'grid' | 'list' | 'detail';
export type GridSize = 'small' | 'medium' | 'large';
export interface Result<T> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface Pagination {
    page: number;
    pageSize: number;
    total: number;
}
export interface DateRange {
    start: Date;
    end: Date;
}
export interface SizeRange {
    min: number;
    max: number;
}
export interface DurationRange {
    min: number;
    max: number;
}
export interface Progress {
    current: number;
    total: number;
    percentage: number;
    message?: string;
}
export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    duration?: number;
    timestamp: number;
}
//# sourceMappingURL=common.d.ts.map
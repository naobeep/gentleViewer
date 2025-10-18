export interface SchemaVersion {
    version: number;
    applied_at: string;
    description: string;
}
export interface DatabaseStats {
    fileCount: number;
    tagCount: number;
    totalSize: number;
    databaseSize: number;
    lastOptimized?: string;
    lastBackup?: string;
}
export interface BackupInfo {
    id: string;
    path: string;
    size: number;
    created_at: string;
    fileCount: number;
    tagCount: number;
}
export interface QueryResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}
//# sourceMappingURL=database.d.ts.map
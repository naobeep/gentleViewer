import { Progress } from './common';
export declare const IPC_CHANNELS: {
    readonly SCAN_FILES: "scan-files";
    readonly GET_FILES: "get-files";
    readonly GET_FILE_BY_ID: "get-file-by-id";
    readonly REMOVE_FILE: "remove-file";
    readonly UPDATE_FILE: "update-file";
    readonly FILE_EXISTS: "file-exists";
    readonly GET_FILE_STATS: "get-file-stats";
    readonly READ_FILE: "read-file";
    readonly SHOW_IN_EXPLORER: "show-in-explorer";
    readonly OPEN_EXTERNAL: "open-external";
    readonly READ_ARCHIVE: "read-archive";
    readonly EXTRACT_ARCHIVE_IMAGE: "extract-archive-image";
    readonly GET_VIDEO_METADATA: "get-video-metadata";
    readonly EXTRACT_EMBEDDED_SUBTITLE: "extract-embedded-subtitle";
    readonly GET_AUDIO_METADATA: "get-audio-metadata";
    readonly GET_PDF_METADATA: "get-pdf-metadata";
    readonly GET_IMAGE_EXIF: "get-image-exif";
    readonly GET_TAGS: "get-tags";
    readonly GET_TAG_BY_ID: "get-tag-by-id";
    readonly CREATE_TAG: "create-tag";
    readonly UPDATE_TAG: "update-tag";
    readonly DELETE_TAG: "delete-tag";
    readonly SEARCH_TAGS: "search-tags";
    readonly ADD_TAG_TO_FILE: "add-tag-to-file";
    readonly REMOVE_TAG_FROM_FILE: "remove-tag-from-file";
    readonly ADD_TAGS_TO_FILES: "add-tags-to-files";
    readonly SEARCH_FILES: "search-files";
    readonly GET_SAVED_SEARCHES: "get-saved-searches";
    readonly SAVE_SEARCH: "save-search";
    readonly DELETE_SAVED_SEARCH: "delete-saved-search";
    readonly GET_BOOKMARK: "get-bookmark";
    readonly SAVE_BOOKMARK: "save-bookmark";
    readonly DELETE_BOOKMARK: "delete-bookmark";
    readonly GET_CHAPTERS: "get-chapters";
    readonly SAVE_CHAPTERS: "save-chapters";
    readonly GET_SETTINGS: "get-settings";
    readonly SAVE_SETTINGS: "save-settings";
    readonly GET_SETTING: "get-setting";
    readonly SET_SETTING: "set-setting";
    readonly GET_DATABASE_STATS: "get-database-stats";
    readonly OPTIMIZE_DATABASE: "optimize-database";
    readonly BACKUP_DATABASE: "backup-database";
    readonly RESTORE_DATABASE: "restore-database";
    readonly SHOW_OPEN_DIALOG: "show-open-dialog";
    readonly SHOW_SAVE_DIALOG: "show-save-dialog";
    readonly SHOW_MESSAGE_BOX: "show-message-box";
    readonly SAVE_SNAPSHOT: "save-snapshot";
    readonly WATCH_FILES: "watch-files";
    readonly UNWATCH_FILES: "unwatch-files";
    readonly FILE_CHANGED: "file-changed";
    readonly SCAN_PROGRESS: "scan-progress";
    readonly DATABASE_UPDATED: "database-updated";
    readonly SETTINGS_CHANGED: "settings-changed";
};
export interface ScanOptions {
    recursive: boolean;
    excludeHidden: boolean;
    minFileSize: number;
    skipDuplicates: boolean;
    extensionFilter: string[];
    autoTagging: boolean;
}
export interface FileChangeEvent {
    type: 'add' | 'change' | 'unlink' | 'rename';
    path: string;
    stats?: {
        size: number;
        mtime: Date;
    };
}
export interface ScanResult {
    [key: string]: any;
}
export interface ScanProgressEvent {
    type: 'start' | 'progress' | 'complete' | 'error';
    progress?: Progress;
    result?: ScanResult;
    error?: string;
}
export interface OpenDialogOptions {
    title?: string;
    defaultPath?: string;
    buttonLabel?: string;
    filters?: FileFilter[];
    properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory'>;
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
//# sourceMappingURL=ipc.d.ts.map
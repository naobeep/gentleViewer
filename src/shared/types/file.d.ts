import { FileType } from './common';
import { Tag } from './tag';
export interface FileInfo {
    id: number;
    file_path: string;
    file_name: string;
    file_extension: string;
    file_type: FileType;
    file_size: number;
    is_archive: boolean;
    image_count?: number;
    first_image_path?: string;
    is_encrypted: boolean;
    duration?: number;
    width?: number;
    height?: number;
    codec_video?: string;
    codec_audio?: string;
    bitrate?: number;
    framerate?: number;
    page_count?: number;
    title?: string;
    artist?: string;
    album?: string;
    is_available: boolean;
    last_checked?: string;
    created_at: string;
    updated_at: string;
    registered_at: string;
    tags?: Tag[];
    thumbnailPath?: string;
}
export interface FileStats {
    totalFiles: number;
    totalSize: number;
    byType: Record<FileType, number>;
    byExtension: Record<string, number>;
}
export interface ScanResult {
    success: boolean;
    scannedCount: number;
    addedCount: number;
    skippedCount: number;
    errorCount: number;
    errors: ScanError[];
    duration: number;
}
export interface ScanError {
    path: string;
    error: string;
    timestamp: number;
}
export interface FileMetadata {
    video?: VideoMetadata;
    audio?: AudioMetadata;
    pdf?: PDFMetadata;
    image?: ImageMetadata;
    archive?: ArchiveMetadata;
}
export interface VideoMetadata {
    duration: number;
    width: number;
    height: number;
    codec_video: string;
    codec_audio: string;
    bitrate: number;
    framerate: number;
    hasAudio: boolean;
    hasVideo: boolean;
    audioTracks: AudioTrack[];
    subtitleTracks: SubtitleTrack[];
}
export interface AudioTrack {
    id: number;
    language: string;
    label: string;
    channels: number;
    codec: string;
}
export interface SubtitleTrack {
    id: number;
    language: string;
    label: string;
    format: 'srt' | 'vtt' | 'ass';
    path?: string;
    isEmbedded: boolean;
}
export interface AudioMetadata {
    duration: number;
    bitrate: number;
    sampleRate: number;
    channels: number;
    format: string;
    title?: string;
    artist?: string;
    album?: string;
    year?: number;
    genre?: string;
    track?: number;
    picture?: {
        data: Uint8Array;
        format: string;
    };
}
export interface PDFMetadata {
    numPages: number;
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
    pdfVersion?: string;
}
export interface ImageMetadata {
    width: number;
    height: number;
    format: string;
    colorSpace?: string;
    hasAlpha: boolean;
    exif?: EXIFData;
}
export interface EXIFData {
    make?: string;
    model?: string;
    dateTime?: Date;
    orientation?: number;
    exposureTime?: string;
    fNumber?: number;
    iso?: number;
    focalLength?: number;
    flash?: string;
    gps?: {
        latitude: number;
        longitude: number;
    };
}
export interface ArchiveMetadata {
    totalEntries: number;
    imageEntries: number;
    totalSize: number;
    isEncrypted: boolean;
}
//# sourceMappingURL=file.d.ts.map
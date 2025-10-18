// src/shared/types/file.ts

import { FileType } from './common';
import { Tag } from './tag';

/**
 * ファイル情報
 */
export interface FileInfo {
  // 基本情報
  id: number;
  file_path: string;
  file_name: string;
  file_extension: string;
  file_type: FileType;
  file_size: number;

  // アーカイブ固有
  is_archive: boolean;
  image_count?: number;
  first_image_path?: string;
  is_encrypted: boolean;

  // メディア固有
  duration?: number; // 秒
  width?: number;
  height?: number;
  codec_video?: string;
  codec_audio?: string;
  bitrate?: number; // kbps
  framerate?: number;

  // PDF固有
  page_count?: number;

  // メタデータ
  title?: string;
  artist?: string;
  album?: string;

  // ファイル状態
  is_available: boolean;
  last_checked?: string;

  // タイムスタンプ
  created_at: string;
  updated_at: string;
  registered_at: string;

  // リレーション
  tags?: Tag[];

  // UI用
  thumbnailPath?: string;
}

/**
 * ファイル統計情報
 */
export interface FileStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<FileType, number>;
  byExtension: Record<string, number>;
}

/**
 * ファイルスキャン結果
 */
export interface ScanResult {
  success: boolean;
  scannedCount: number;
  addedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: ScanError[];
  duration: number; // ミリ秒
}

/**
 * スキャンエラー
 */
export interface ScanError {
  path: string;
  error: string;
  timestamp: number;
}

/**
 * ファイルメタデータ（形式固有）
 */
export interface FileMetadata {
  // 動画メタデータ
  video?: VideoMetadata;
  // 音声メタデータ
  audio?: AudioMetadata;
  // PDF メタデータ
  pdf?: PDFMetadata;
  // 画像メタデータ
  image?: ImageMetadata;
  // アーカイブメタデータ
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

// 追加: FileInfo 型（search.ts 等で参照される） — 名前を変更して既存の FileInfo と衝突しないようにする
export interface SearchFileInfo {
  id: string;
  path: string;
  name: string;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  createdAt?: string; // ISO
  modifiedAt?: string; // ISO
  // 必要ならプロジェクト固有のプロパティを追加
}

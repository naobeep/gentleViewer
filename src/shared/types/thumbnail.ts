export type ViewerType = 'archive' | 'video' | 'pdf' | 'image' | 'audio' | 'unsupported';

export interface ThumbnailGenerationProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  total: number;
  completed: number;
  skipped: number;
  errors: number;
  currentFile?: string;
  startedAt?: number;
  updatedAt?: number;
}

export interface ThumbnailError {
  filePath?: string;
  fileName?: string;
  error: string;
  timestamp: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  icon?: string;
  query?: any;
  isFavorite?: boolean;
  isPinned?: boolean;
  executionCount?: number;
  createdAt?: string;
  lastExecuted?: string | null;
}

export interface SearchQuery {
  tags?: { include: string[]; exclude: string[]; any: string[] };
  fileTypes?: string[];
  freeText?: string;
}

import type { ThumbnailGenerationProgress, ThumbnailError, SavedSearch, SearchQuery } from '../../shared/types/thumbnail';

declare global {
  interface Window {
    electronAPI: {
      // サムネイル進捗関連
      onThumbnailProgress: (cb: (p: ThumbnailGenerationProgress) => void) => () => void;
      onThumbnailError: (cb: (e: ThumbnailError) => void) => () => void;
      startThumbnailGeneration?: (filePaths: string[]) => Promise<any>;
      pauseThumbnailGeneration: () => Promise<void>;
      resumeThumbnailGeneration: () => Promise<void>;
      cancelThumbnailGeneration: () => Promise<void>;

      // 保存済み検索関連
      getSavedSearches: () => Promise<SavedSearch[]>;
      saveSavedSearch: (s: SavedSearch) => Promise<void>;
      executeSearch: (q: SearchQuery) => Promise<void>;
      updateSearchExecutionCount: (id: string) => Promise<void>;
    };
  }
}

export {};
import { FileType, SortKey, SortOrder, DateRange, SizeRange, DurationRange } from './common';
import { TagSelection } from './tag';
export interface SearchQuery {
    filename?: string;
    regex?: boolean;
    tags?: TagSelection;
    fileTypes?: FileType[];
    extensions?: string[];
    dateRange?: DateRange;
    sizeRange?: SizeRange;
    durationRange?: DurationRange;
    imageCountRange?: {
        min: number;
        max: number;
    };
    pageCountRange?: {
        min: number;
        max: number;
    };
    widthRange?: {
        min: number;
        max: number;
    };
    heightRange?: {
        min: number;
        max: number;
    };
    favorite?: boolean;
    availableOnly?: boolean;
    sortBy?: SortKey;
    sortOrder?: SortOrder;
    limit?: number;
    offset?: number;
}
export interface SearchResult {
    files: FileInfo[];
    total: number;
    query: SearchQuery;
    duration: number;
}
export interface SavedSearch {
    id: number;
    name: string;
    search_query: string;
    is_favorite: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}
export interface SmartSearch extends SavedSearch {
    isDynamic: boolean;
}
//# sourceMappingURL=search.d.ts.map
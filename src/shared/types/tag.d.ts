export interface Tag {
    id: number;
    tag_name: string;
    color: string;
    icon?: string;
    parent_id?: number;
    description?: string;
    is_favorite: boolean;
    is_hidden: boolean;
    require_auth: boolean;
    sort_order: number;
    usage_count: number;
    created_at: string;
    updated_at: string;
    children?: Tag[];
    parent?: Tag;
}
export interface CreateTagParams {
    tag_name: string;
    color?: string;
    icon?: string;
    parent_id?: number;
    description?: string;
    is_hidden?: boolean;
}
export interface UpdateTagParams {
    tag_name?: string;
    color?: string;
    icon?: string;
    parent_id?: number;
    description?: string;
    is_favorite?: boolean;
    is_hidden?: boolean;
    require_auth?: boolean;
    sort_order?: number;
}
export interface TagStats {
    totalTags: number;
    favoriteTags: number;
    hiddenTags: number;
    unusedTags: number;
    averageUsage: number;
}
export type TagFilterMode = 'and' | 'or' | 'not';
export interface TagSelection {
    include: number[];
    exclude: number[];
    any: number[];
    mode: TagFilterMode;
}
//# sourceMappingURL=tag.d.ts.map
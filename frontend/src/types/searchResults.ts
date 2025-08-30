
export type ResultCounts = {
    fetched: number;
    total: number;
}

export type SortOrder = 'similarity' | 'similarity_asc' | 'semantic_page' | 'similarity_max' | 'similarity_max_asc' | 'similarity_avg' | 'similarity_avg_asc' | 'direction' | 'direction_rev'
from backend.types import ResultFilters


def get_included_path_indices(filters: ResultFilters, image_paths: list[str]) -> list[int]:
    def passes_path_contains_filter(path):
        if not filters.path_contains:
            return True
        return any(fragment in path
                   for fragment in filters.path_contains)

    def passes_path_not_contains_filter(path):
        if not filters.path_not_contains:
            return True
        return not any(fragment in path
                        for fragment in filters.path_not_contains)

    def passes_filter(path):
        return passes_path_contains_filter(path) and passes_path_not_contains_filter(path)

    return [i for i, p in enumerate(image_paths)
            if passes_filter(p)]

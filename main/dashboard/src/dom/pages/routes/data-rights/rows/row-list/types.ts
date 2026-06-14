import type { BrowseResponse, Scope } from "../../../../../../state/data-rights/data-rights-client/index.js";

export interface RowListState {
    scope: Scope;
    table: string;
    from: number | null;
    to: number | null;
    rows: Record<string, unknown>[];
    info: BrowseResponse | null;
    selectedIndex: number;
    loadingMore: boolean;
    hasMore: boolean;
}

export interface RowListHandlers {
    onFilterChange: (from: number | null, to: number | null) => void;
    onBulkDelete: (from: number, to: number) => void;
    onBack?: () => void;
}

import type { BrowseResponse, Scope, ScopeListItem } from "../data-rights-client/index.js";

export type View = "tree" | "list" | "detail";

export interface PageState {
    scopes: ScopeListItem[];
    scope: Scope | null;
    scopeItem: ScopeListItem | null;
    table: string | null;
    expanded: Set<string>;
    rows: Record<string, unknown>[];
    info: BrowseResponse | null;
    selectedIndex: number;
    from: number | null;
    to: number | null;
    offset: number;
    loadingMore: boolean;
    hasMore: boolean;
    view: View;
}

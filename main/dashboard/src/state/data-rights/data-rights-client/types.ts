export type ScopeKind = "app" | "varez" | "bot" | "clan" | "clan_audit" | "plugin" | "local";

export interface Scope {
    kind: ScopeKind;
    clanId?: string;
    mode?: string;
}

export interface ScopeListTable {
    name: string;
    hasRows: boolean;
}

export interface ScopeListItem {
    kind: ScopeKind;
    label: string;
    clanId?: string;
    clanSlug?: string;
    mode?: string;
    tables: ScopeListTable[];
}

export interface BrowseResponse {
    rows: Record<string, unknown>[];
    total: number;
    pkCols: string[];
    tsCol: string | null;
    excludedColumns: readonly string[];
    secretColumns: readonly string[];
    canDeleteRow: boolean;
    canBulkDelete: boolean;
}

export interface DeleteResponse {
    ok: boolean;
    deleted: number;
    nulled: number;
}

export type WritesStreamKind = "insert" | "update" | "delete" | "replace";

export interface WritesStreamEvent {
    scopeKey: string;
    table: string;
    kind: WritesStreamKind;
    nowHasRows?: boolean;
    scopeAdded?: boolean;
}

export interface DataRightsError {
    reason: string;
    message?: string;
    retryAfterMs?: number;
}

export interface UserDataStats {
    totalRows: number;
    totalBytes: number;
    totalDbs: number;
    firstEntryAt: number | null;
}

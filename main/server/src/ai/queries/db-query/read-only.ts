import { containsBlockedKeyword, tableReferencesAreAllowed } from "../sql-guard.js";
import { CHAIN_VIEW } from "./types.js";

export function isReadOnly(sql: string): boolean {
    const trimmed = sql.trim();
    if (!trimmed.toUpperCase().startsWith("SELECT")) return false;
    return containsBlockedKeyword(trimmed) === null;
}

const CHAIN_ALLOWED_VIEWS = new Set([CHAIN_VIEW]);

export function chainSqlReferencesAllowedTablesOnly(sql: string): { ok: boolean; offending?: string } {
    return tableReferencesAreAllowed(sql, CHAIN_ALLOWED_VIEWS);
}

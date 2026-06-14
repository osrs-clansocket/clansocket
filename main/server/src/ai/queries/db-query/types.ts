export const CHAIN_DB = "chain";
export const CLAN_DB = "clan";
export const CHAIN_VIEW = "chain_steps";
export const MAX_ROWS = 50;

export interface QueryResult {
    db: string;
    sql: string;
    clan?: string;
    rows: Record<string, unknown>[];
    error: string | null;
}

export function queryResult(
    db: string,
    sql: string,
    rows: Record<string, unknown>[],
    error: string | null,
    clan?: string,
): QueryResult {
    return clan !== undefined ? { db, sql, clan, rows, error } : { db, sql, rows, error };
}

export interface QueryContext {
    siteAccountId: string;
}

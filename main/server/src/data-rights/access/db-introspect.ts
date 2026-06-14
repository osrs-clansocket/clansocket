import type { Database } from "better-sqlite3";

export interface ColumnInfo {
    name: string;
    nameQuoted: string;
    pkOrder: number;
}

export interface TableIntrospection {
    cols: ColumnInfo[];
    pkCols: string[];
    tsCol: string | null;
}

const TS_PROBE_COLUMNS = [
    "created_at",
    "issued_at",
    "captured_at",
    "recorded_at",
    "received_at",
    "ts",
    "timestamp",
    "observed_at",
    "occurred_at",
    "first_seen_at",
    "first_seen",
    "started_at",
    "verified_at",
    "bound_at",
    "linked_at",
    "performed_at",
    "updated_at",
    "minute_bucket",
];

const introspectionCache = new WeakMap<Database, Map<string, TableIntrospection | null>>();

export function quoteIdent(name: string): string {
    return `"${name.split('"').join('""')}"`;
}

export function placeholders(n: number): string {
    return new Array(n).fill("?").join(", ");
}

function pickTsColumn(cols: ColumnInfo[]): string | null {
    const names = new Set(cols.map((c) => c.name));
    for (const probe of TS_PROBE_COLUMNS) {
        if (names.has(probe)) return probe;
    }
    return null;
}

export function introspectTable(db: Database, table: string): TableIntrospection | null {
    let cache = introspectionCache.get(db);
    if (!cache) {
        cache = new Map();
        introspectionCache.set(db, cache);
    }
    if (cache.has(table)) return cache.get(table) ?? null;
    const tableQuoted = quoteIdent(table);
    const rows = db.prepare(`PRAGMA table_info(${tableQuoted})`).all() as Array<{
        name: string;
        pk: number;
    }>;
    if (rows.length === 0) {
        cache.set(table, null);
        return null;
    }
    const cols = rows.map((r) => ({
        name: r.name,
        nameQuoted: quoteIdent(r.name),
        pkOrder: r.pk,
    }));
    const pkCols = cols
        .filter((c) => c.pkOrder > 0)
        .sort((a, b) => a.pkOrder - b.pkOrder)
        .map((c) => c.name);
    const info: TableIntrospection = {
        cols,
        pkCols,
        tsCol: pickTsColumn(cols),
    };
    cache.set(table, info);
    return info;
}

export function buildSizeExpr(cols: ColumnInfo[]): string {
    return cols.map((c) => `coalesce(length(cast(${c.nameQuoted} as blob)), 0)`).join(" + ");
}

export function projectionColumns(cols: ColumnInfo[], excludeColumns: readonly string[] = []): string {
    const exclude = new Set(excludeColumns);
    return cols
        .filter((c) => !exclude.has(c.name))
        .map((c) => c.nameQuoted)
        .join(", ");
}

export function normalizeTs(ts: number | null | undefined): number | null {
    if (ts === null || ts === undefined) return null;
    if (!Number.isFinite(ts) || ts <= 0) return null;
    if (ts < 1e12) return Math.round(ts * 1000);
    return Math.round(ts);
}

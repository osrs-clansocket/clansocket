import type { Database } from "better-sqlite3";
import { buildSizeExpr, introspectTable, normalizeTs, quoteIdent } from "../../access/db-introspect.js";
import { selectOwnedClanMembers, selectOwnedRosterDiffs, type OwnedRsnWindow } from "../../temporal-correlation.js";
import { ZERO, type TableStat } from "./types.js";

function tsColumnToMsExpr(name: string): string {
    if (name === "minute_bucket") return `${quoteIdent(name)} * 60000`;
    return quoteIdent(name);
}

export function statOne(db: Database, table: string, column: string, value: string): TableStat {
    const info = introspectTable(db, table);
    if (!info) return ZERO;
    const sizeExpr = buildSizeExpr(info.cols);
    const tsSelect = info.tsCol ? `, MIN(${tsColumnToMsExpr(info.tsCol)}) AS min_ts` : "";
    const sql = `SELECT COUNT(*) AS r, COALESCE(SUM(${sizeExpr}), 0) AS b${tsSelect} FROM ${quoteIdent(table)} WHERE ${quoteIdent(column)} = ?`;
    const row = db.prepare(sql).get(value) as { r: number; b: number; min_ts?: number | null };
    return {
        rows: Number(row.r) || 0,
        bytes: Number(row.b) || 0,
        minTs: info.tsCol ? normalizeTs(row.min_ts ?? null) : null,
    };
}

export function statChildJoined(
    db: Database,
    childTable: string,
    childParentKey: string,
    parentTable: string,
    parentKey: string,
    parentFilterColumn: string,
    value: string,
): TableStat {
    const childInfo = introspectTable(db, childTable);
    const parentInfo = introspectTable(db, parentTable);
    if (!childInfo || !parentInfo) return ZERO;
    const sizeExpr = childInfo.cols.map((c) => `coalesce(length(cast(c.${c.nameQuoted} as blob)), 0)`).join(" + ");
    const sql =
        `SELECT COUNT(*) AS r, COALESCE(SUM(${sizeExpr}), 0) AS b ` +
        `FROM ${quoteIdent(childTable)} AS c ` +
        `JOIN ${quoteIdent(parentTable)} AS p ON p.${quoteIdent(parentKey)} = c.${quoteIdent(childParentKey)} ` +
        `WHERE p.${quoteIdent(parentFilterColumn)} = ?`;
    const row = db.prepare(sql).get(value) as { r: number; b: number };
    return { rows: Number(row.r) || 0, bytes: Number(row.b) || 0, minTs: null };
}

function jsonBytes(row: Record<string, unknown>): number {
    return JSON.stringify(row).length;
}

export function statTemporalMembers(clanId: string, windows: OwnedRsnWindow[]): TableStat {
    const rows = selectOwnedClanMembers(clanId, windows);
    if (rows.length === 0) return ZERO;
    let bytes = 0;
    let minTs: number | null = null;
    for (const r of rows) {
        bytes += jsonBytes(r as unknown as Record<string, unknown>);
        if (minTs === null || r.first_observed_at < minTs) minTs = r.first_observed_at;
    }
    return { rows: rows.length, bytes, minTs: normalizeTs(minTs) };
}

export function statTemporalDiffs(clanId: string, windows: OwnedRsnWindow[]): TableStat {
    const rows = selectOwnedRosterDiffs(clanId, windows);
    if (rows.length === 0) return ZERO;
    let bytes = 0;
    let minTs: number | null = null;
    for (const r of rows) {
        bytes += jsonBytes(r as unknown as Record<string, unknown>);
        if (minTs === null || r.detected_at < minTs) minTs = r.detected_at;
    }
    return { rows: rows.length, bytes, minTs: normalizeTs(minTs) };
}

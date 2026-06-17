import type { Request, Response } from "express";
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_NOT_FOUND } from "../../shared/http/http-status.js";
import { asFiniteNumber } from "../../shared/coerce.js";
import { isClanManager } from "../../database/clans/access/clan-manager-helpers.js";
import { introspectTable, placeholders, projectionColumns, quoteIdent } from "./db-introspect.js";
import {
    openScopeDb,
    parseScope,
    planForTable,
    SCOPE_CLAN,
    SCOPE_CLAN_AUDIT,
    SCOPE_PLUGIN,
    type Scope,
} from "../scopes/user-scope/index.js";
import { GLOBAL_SECRET_COLUMNS } from "../scopes/manifest/index.js";
import { READ_ONLY_BROWSE_TABLES } from "../scopes/manifest/index.js";

const MANAGER_TABLE_PREFIXES: Record<string, string> = {
    [SCOPE_PLUGIN]: "plugin_",
    [SCOPE_CLAN]: "clan_",
    [SCOPE_CLAN_AUDIT]: "clan_audit_",
};

function clanIdOfScope(scope: Scope): string | null {
    if (scope.kind === SCOPE_CLAN || scope.kind === SCOPE_CLAN_AUDIT || scope.kind === SCOPE_PLUGIN) {
        return scope.clanId;
    }
    return null;
}

export function browseManagerRows(scope: Scope, args: BrowseRequest): BrowseResponse | null {
    const allowedPrefix = MANAGER_TABLE_PREFIXES[scope.kind];
    if (!allowedPrefix || !args.table.startsWith(allowedPrefix)) return null;
    const db = openScopeDb(scope);
    if (!db) return null;
    const info = introspectTable(db, args.table);
    if (!info) return null;

    const tsCol = info.tsCol ? quoteIdent(info.tsCol) : null;
    const from = asFiniteNumber(args.from);
    const to = asFiniteNumber(args.to);
    const useDateFilter = tsCol !== null && (from !== null || to !== null);
    const rsnFilter = buildRsnFilter(
        args,
        info.cols.some((c) => c.name === "rsn"),
    );
    const conditions: string[] = [];
    const whereArgs: unknown[] = [];
    if (useDateFilter) {
        conditions.push(`${tsCol} BETWEEN ? AND ?`);
        whereArgs.push(from ?? 0, to ?? Number.MAX_SAFE_INTEGER);
    }
    if (rsnFilter) {
        conditions.push(`rsn LIKE ? COLLATE NOCASE`);
        whereArgs.push(rsnFilter.arg);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const tableQuoted = quoteIdent(args.table);
    const total = (
        db.prepare(`SELECT COUNT(*) AS n FROM ${tableQuoted} ${whereClause}`).get(...whereArgs) as { n: number }
    ).n;

    const proj = projectionColumns(info.cols, []);
    const orderParts: string[] = [];
    if (tsCol !== null) orderParts.push(`${tsCol} DESC`);
    for (const c of info.pkCols) orderParts.push(`${quoteIdent(c)} DESC`);
    if (orderParts.length === 0) orderParts.push("rowid");
    const orderBy = orderParts.join(", ");
    const limit = clampLimit(args.limit);
    const offset = clampOffset(args.offset);
    const rows = db
        .prepare(`SELECT ${proj} FROM ${tableQuoted} ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
        .all(...whereArgs, limit, offset) as Record<string, unknown>[];

    const secretColumns = info.cols.map((c) => c.name).filter((c) => GLOBAL_SECRET_COLUMNS.includes(c));
    return {
        rows,
        total: Number(total) || 0,
        pkCols: info.pkCols,
        tsCol: info.tsCol,
        excludedColumns: [],
        secretColumns,
        canDeleteRow: false,
        canBulkDelete: false,
    };
}

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export interface BrowseRequest {
    scope: Scope;
    table: string;
    from?: number;
    to?: number;
    rsn?: string;
    limit?: number;
    offset?: number;
}

function buildRsnFilter(args: BrowseRequest, hasRsnColumn: boolean): { sql: string; arg: string } | null {
    if (!hasRsnColumn) return null;
    if (typeof args.rsn !== "string") return null;
    const trimmed = args.rsn.trim();
    if (trimmed.length === 0) return null;
    return { sql: ` AND rsn LIKE ? COLLATE NOCASE`, arg: `%${trimmed}%` };
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

function clamp(n: number, min: number, max: number): number {
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

function clampLimit(raw: unknown): number {
    const n = asFiniteNumber(raw);
    return clamp(n !== null ? Math.floor(n) : DEFAULT_LIMIT, 1, MAX_LIMIT);
}

function clampOffset(raw: unknown): number {
    const n = asFiniteNumber(raw);
    return Math.max(0, n !== null ? Math.floor(n) : 0);
}

export function browseUserRows(siteAccountId: string, args: BrowseRequest): BrowseResponse | null {
    const db = openScopeDb(args.scope);
    if (!db) return null;
    const plan = planForTable(siteAccountId, args.scope, args.table);
    if (!plan) return null;
    if (plan.identifierValues.length === 0) {
        return {
            rows: [],
            total: 0,
            pkCols: [],
            tsCol: null,
            excludedColumns: plan.excludeColumns,
            secretColumns: [],
            canDeleteRow: false,
            canBulkDelete: false,
        };
    }
    const info = introspectTable(db, args.table);
    if (!info) return null;

    const ownerQuoted = quoteIdent(plan.ownershipColumn);
    const tsCol = info.tsCol ? quoteIdent(info.tsCol) : null;
    const from = asFiniteNumber(args.from);
    const to = asFiniteNumber(args.to);
    const useDateFilter = tsCol !== null && (from !== null || to !== null);
    const tsWhere = useDateFilter ? ` AND ${tsCol} BETWEEN ? AND ?` : "";
    const tsArgs = useDateFilter ? [from ?? 0, to ?? Number.MAX_SAFE_INTEGER] : [];
    const rsnFilter = buildRsnFilter(
        args,
        info.cols.some((c) => c.name === "rsn"),
    );

    const ownershipWhere = plan.customWhere
        ? plan.customWhere.sql
        : `${ownerQuoted} IN (${placeholders(plan.identifierValues.length)})`;
    const ownershipArgs = plan.customWhere ? [...plan.customWhere.args] : [...plan.identifierValues];

    const tableQuoted = quoteIdent(args.table);
    const where = `${ownershipWhere}${tsWhere}${rsnFilter ? rsnFilter.sql : ""}`;
    const baseArgs = [...ownershipArgs, ...tsArgs, ...(rsnFilter ? [rsnFilter.arg] : [])];
    const total = (
        db.prepare(`SELECT COUNT(*) AS n FROM ${tableQuoted} WHERE ${where}`).get(...baseArgs) as { n: number }
    ).n;

    const proj = projectionColumns(info.cols, plan.excludeColumns);
    const colNames = new Set(info.cols.map((c) => c.name));
    const browseOrder = (plan.browseOrder ?? []).filter((c) => colNames.has(c));
    const orderParts: string[] = [];
    if (browseOrder.length > 0) {
        for (const c of browseOrder) orderParts.push(`${quoteIdent(c)} ASC`);
    } else {
        if (tsCol !== null) orderParts.push(`${tsCol} DESC`);
        for (const c of info.pkCols) orderParts.push(`${quoteIdent(c)} DESC`);
    }
    if (orderParts.length === 0) orderParts.push(ownerQuoted);
    const orderBy = orderParts.join(", ");
    const limit = clampLimit(args.limit);
    const offset = clampOffset(args.offset);
    const rows = db
        .prepare(`SELECT ${proj} FROM ${tableQuoted} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
        .all(...baseArgs, limit, offset) as Record<string, unknown>[];

    const excluded = new Set(plan.excludeColumns);
    const readOnly = READ_ONLY_BROWSE_TABLES.has(args.table);
    const canDeleteRow = !readOnly && info.pkCols.length > 0 && info.pkCols.every((c) => !excluded.has(c));
    const secretColumns = info.cols.map((c) => c.name).filter((c) => GLOBAL_SECRET_COLUMNS.includes(c));
    return {
        rows,
        total: Number(total) || 0,
        pkCols: info.pkCols,
        tsCol: info.tsCol,
        excludedColumns: plan.excludeColumns,
        secretColumns,
        canDeleteRow,
        canBulkDelete: !readOnly && info.tsCol !== null,
    };
}

export function handleBrowse(req: Request, res: Response, siteAccountId: string): void {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const scope = parseScope(body.scope);
    if (!scope) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_scope" });
        return;
    }
    const table = body.table;
    if (typeof table !== "string" || table.length === 0) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_table" });
        return;
    }
    const args: BrowseRequest = {
        scope,
        table,
        from: body.from as number | undefined,
        to: body.to as number | undefined,
        rsn: typeof body.rsn === "string" ? body.rsn : undefined,
        limit: body.limit as number | undefined,
        offset: body.offset as number | undefined,
    };
    if (body.managerView === true) {
        const clanId = clanIdOfScope(scope);
        if (clanId === null || !isClanManager(siteAccountId, clanId)) {
            res.status(HTTP_FORBIDDEN).json({ error: "not_clan_manager" });
            return;
        }
        const result = browseManagerRows(scope, args);
        if (!result) {
            res.status(HTTP_NOT_FOUND).json({ error: "not_in_manifest" });
            return;
        }
        res.json(result);
        return;
    }
    const result = browseUserRows(siteAccountId, args);
    if (!result) {
        res.status(HTTP_NOT_FOUND).json({ error: "not_in_manifest" });
        return;
    }
    res.json(result);
}

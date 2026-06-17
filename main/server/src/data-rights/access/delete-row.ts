import type { Request, Response } from "express";
import { HTTP_BAD_REQUEST, HTTP_NOT_FOUND } from "../../shared/http/http-status.js";
import { introspectTable, placeholders, quoteIdent } from "./db-introspect.js";
import { openScopeDb, parseScope, planForTable, type Scope } from "../scopes/user-scope/index.js";
import { ACTION_USER_BULK_DELETE, ACTION_USER_ROW_DELETE } from "../scopes/action-kinds.js";
import { READ_ONLY_BROWSE_TABLES } from "../scopes/manifest/index.js";
import { recordAction } from "../cooldown.js";

export interface DeleteRowRequest {
    scope: Scope;
    table: string;
    row?: Record<string, unknown>;
    filter?: { from: number; to: number };
}

export interface DeleteRowResponse {
    ok: boolean;
    deleted: number;
    nulled: number;
}

export function deleteUserRows(siteAccountId: string, args: DeleteRowRequest): DeleteRowResponse | null {
    if (READ_ONLY_BROWSE_TABLES.has(args.table)) return null;
    const db = openScopeDb(args.scope);
    if (!db) return null;
    const plan = planForTable(siteAccountId, args.scope, args.table);
    if (!plan) return null;
    if (plan.identifierValues.length === 0) return { ok: true, deleted: 0, nulled: 0 };
    const info = introspectTable(db, args.table);
    if (!info) return null;

    const ownerQuoted = quoteIdent(plan.ownershipColumn);
    const tableQuoted = quoteIdent(args.table);

    const ownershipWhere = plan.customWhere
        ? plan.customWhere.sql
        : `${ownerQuoted} IN (${placeholders(plan.identifierValues.length)})`;
    const ownershipArgs = plan.customWhere ? [...plan.customWhere.args] : [...plan.identifierValues];

    let extraWhere = "";
    const extraArgs: unknown[] = [];
    if (args.row) {
        if (info.pkCols.length === 0) return null;
        for (const col of info.pkCols) {
            const value = args.row[col];
            if (value === undefined) return null;
            extraWhere += ` AND ${quoteIdent(col)} = ?`;
            extraArgs.push(value);
        }
    } else if (args.filter) {
        if (info.tsCol === null) return null;
        extraWhere = ` AND ${quoteIdent(info.tsCol)} BETWEEN ? AND ?`;
        extraArgs.push(args.filter.from, args.filter.to);
    } else {
        return null;
    }

    const where = `${ownershipWhere}${extraWhere}`;
    const allArgs = [...ownershipArgs, ...extraArgs];

    let deleted = 0;
    let nulled = 0;
    db.transaction(() => {
        if (plan.action === "null") {
            const r = db.prepare(`UPDATE ${tableQuoted} SET ${ownerQuoted} = NULL WHERE ${where}`).run(...allArgs);
            nulled = r.changes;
        } else {
            const r = db.prepare(`DELETE FROM ${tableQuoted} WHERE ${where}`).run(...allArgs);
            deleted = r.changes;
        }
    })();

    return { ok: true, deleted, nulled };
}

function summarizeAction(args: DeleteRowRequest, result: DeleteRowResponse): string {
    const base = { table: args.table, scope: args.scope, deleted: result.deleted, nulled: result.nulled };
    return JSON.stringify(args.row ? { ...base, row: args.row } : { ...base, filter: args.filter });
}

export function handleDelete(req: Request, res: Response, siteAccountId: string): void {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (body.managerView === true) {
        res.status(HTTP_BAD_REQUEST).json({ error: "manager_view_is_read_only" });
        return;
    }
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
    const row = body.row && typeof body.row === "object" ? (body.row as Record<string, unknown>) : undefined;
    const filterRaw = body.filter as { from?: unknown; to?: unknown } | undefined;
    const filter =
        filterRaw && typeof filterRaw.from === "number" && typeof filterRaw.to === "number"
            ? { from: filterRaw.from, to: filterRaw.to }
            : undefined;
    if ((row && filter) || (!row && !filter)) {
        res.status(HTTP_BAD_REQUEST).json({ error: "row_xor_filter" });
        return;
    }
    const args: DeleteRowRequest = { scope, table, row, filter };
    const result = deleteUserRows(siteAccountId, args);
    if (!result) {
        res.status(HTTP_NOT_FOUND).json({ error: "not_in_manifest_or_missing_pk_or_ts" });
        return;
    }
    const kind = filter ? ACTION_USER_BULK_DELETE : ACTION_USER_ROW_DELETE;
    recordAction(siteAccountId, kind, summarizeAction(args, result));
    res.json(result);
}

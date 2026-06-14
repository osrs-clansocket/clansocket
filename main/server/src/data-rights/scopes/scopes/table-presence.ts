import { quoteIdent } from "../../access/db-introspect.js";
import { APP_TABLES_BY_ACCOUNT_HASH, APP_TABLES_BY_SITE_ACCOUNT } from "../manifest/index.js";
import { openScopeDb, planForTable, type Scope } from "../user-scope/index.js";
import type { ScopeListTable } from "./types.js";

export function tableHasUserRows(siteAccountId: string, scope: Scope, table: string): boolean {
    const db = openScopeDb(scope);
    if (!db) return false;
    const plan = planForTable(siteAccountId, scope, table);
    if (!plan) return false;
    try {
        if (plan.customWhere) {
            const row = db
                .prepare(`SELECT 1 FROM ${quoteIdent(table)} WHERE ${plan.customWhere.sql} LIMIT 1`)
                .get(...plan.customWhere.args);
            return Boolean(row);
        }
        if (plan.identifierValues.length === 0) return false;
        const ph = plan.identifierValues.map(() => "?").join(",");
        const row = db
            .prepare(`SELECT 1 FROM ${quoteIdent(table)} WHERE ${quoteIdent(plan.ownershipColumn)} IN (${ph}) LIMIT 1`)
            .get(...plan.identifierValues);
        return Boolean(row);
    } catch {
        return false;
    }
}

export function buildTableList(siteAccountId: string, scope: Scope, names: readonly string[]): ScopeListTable[] {
    return names.map((name) => ({ name, hasRows: tableHasUserRows(siteAccountId, scope, name) }));
}

export function appTables(): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of [...APP_TABLES_BY_ACCOUNT_HASH, ...APP_TABLES_BY_SITE_ACCOUNT]) {
        if (seen.has(e.table)) continue;
        seen.add(e.table);
        out.push(e.table);
    }
    return out;
}

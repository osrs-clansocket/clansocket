import { listAccountHashesForSiteAccount } from "../../../database/site/site-account-helpers/index.js";
import { quoteIdent } from "../../access/db-introspect.js";
import { APP_TABLES_BY_ACCOUNT_HASH, APP_TABLES_BY_SITE_ACCOUNT } from "../manifest/index.js";
import type { TablePlan } from "./scope.js";

interface PlanOpts {
    action?: "delete" | "null";
    excludeColumns?: readonly string[];
    browseOrder?: readonly string[];
}

export function makePlan(
    table: string,
    ownershipColumn: string,
    identifierValues: readonly string[],
    opts?: PlanOpts,
): TablePlan {
    return {
        table,
        ownershipColumn,
        action: opts?.action ?? "delete",
        excludeColumns: opts?.excludeColumns ?? [],
        browseOrder: opts?.browseOrder,
        identifierValues,
    };
}

export function bySiteAccount(siteAccountId: string, table: string): TablePlan | null {
    const hit = APP_TABLES_BY_SITE_ACCOUNT.find((e) => e.table === table);
    return hit ? makePlan(table, hit.column, [siteAccountId], { excludeColumns: hit.excludeColumns }) : null;
}

export function appUnionPlan(siteAccountId: string, table: string): TablePlan | null {
    const hashHit = APP_TABLES_BY_ACCOUNT_HASH.find((e) => e.table === table);
    const sidHit = APP_TABLES_BY_SITE_ACCOUNT.find((e) => e.table === table);
    if (!hashHit || !sidHit) return null;
    const hashes = listAccountHashesForSiteAccount(siteAccountId);
    const parts: string[] = [];
    const args: unknown[] = [];
    if (hashes.length > 0) {
        const ph = hashes.map(() => "?").join(", ");
        parts.push(`${quoteIdent(hashHit.column)} IN (${ph})`);
        args.push(...hashes);
    }
    parts.push(`${quoteIdent(sidHit.column)} = ?`);
    args.push(siteAccountId);
    return {
        ...makePlan(table, sidHit.column, [siteAccountId], {
            excludeColumns: hashHit.excludeColumns ?? sidHit.excludeColumns,
        }),
        customWhere: { sql: `(${parts.join(" OR ")})`, args },
    };
}

export function byAccountHash(
    siteAccountId: string,
    table: string,
    entries: readonly {
        table: string;
        column: string;
        excludeColumns?: readonly string[];
        browseOrder?: readonly string[];
    }[],
): TablePlan | null {
    const hit = entries.find((e) => e.table === table);
    return hit
        ? makePlan(table, hit.column, listAccountHashesForSiteAccount(siteAccountId), {
              excludeColumns: hit.excludeColumns,
              browseOrder: hit.browseOrder,
          })
        : null;
}

export function byClanScoped(
    siteAccountId: string,
    table: string,
    entries: readonly { table: string; column: string; action: "delete" | "null" }[],
    identifierKind: "account_hash" | "site_account_id",
): TablePlan | null {
    const hit = entries.find((e) => e.table === table);
    if (!hit) return null;
    const ids = identifierKind === "account_hash" ? listAccountHashesForSiteAccount(siteAccountId) : [siteAccountId];
    return makePlan(table, hit.column, ids, { action: hit.action });
}

import { getDb, DB_NAMES } from "../../../../database/index.js";
import { chainSqlReferencesAllowedTablesOnly } from "../read-only.js";
import { CHAIN_DB, CHAIN_VIEW, MAX_ROWS, queryResult, type QueryResult } from "../types.js";

export function executeChainQuery(siteAccountId: string | undefined, sql: string): QueryResult {
    if (typeof siteAccountId !== "string" || siteAccountId.length === 0) {
        return queryResult(CHAIN_DB, sql, [], "chain queries require an authenticated site account");
    }
    const guard = chainSqlReferencesAllowedTablesOnly(sql);
    if (!guard.ok) {
        return queryResult(
            CHAIN_DB,
            sql,
            [],
            `chain db only exposes the '${CHAIN_VIEW}' view. blocked table reference: '${guard.offending}'`,
        );
    }
    try {
        const db = getDb(DB_NAMES.AI);
        db.exec(`DROP VIEW IF EXISTS ${CHAIN_VIEW}`);
        db.prepare(
            `CREATE TEMP VIEW ${CHAIN_VIEW} AS
             SELECT chain_id, step, mode, loaded_context, reads, queries, recap, started_at, completed_at
             FROM varez_chain_turns
             WHERE site_account_id = ?`,
        ).run(siteAccountId);
        const rows = db.prepare(sql).all() as Record<string, unknown>[];
        const limited = rows.slice(0, MAX_ROWS);
        const truncated =
            rows.length > MAX_ROWS ? `Results truncated to ${MAX_ROWS} rows (${rows.length} total)` : null;
        return queryResult(CHAIN_DB, sql, limited, truncated);
    } catch (err) {
        return queryResult(CHAIN_DB, sql, [], (err as Error).message);
    }
}

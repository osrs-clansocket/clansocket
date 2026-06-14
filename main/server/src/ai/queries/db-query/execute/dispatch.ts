import { DB_NAMES, getDb, getStaticDb, PLUGIN_DB_PREFIX, STATIC_DB_NAMES } from "../../../../database/index.js";
import type { DbQuery } from "../../../chain/response-parser/index.js";
import { isReadOnly } from "../read-only.js";
import { CHAIN_DB, CLAN_DB, MAX_ROWS, queryResult, type QueryContext, type QueryResult } from "../types.js";
import { executeChainQuery } from "./chain.js";
import { executeClanQuery } from "./clan.js";
import { executePluginQuery } from "./plugin.js";

const STATIC_ALLOWED_DBS = [DB_NAMES.AI, CHAIN_DB, STATIC_DB_NAMES.GAME_IDS] as const;
const STATIC_CATALOG_DBS = new Set<string>(Object.values(STATIC_DB_NAMES));

const DB_ALIASES: Record<string, string> = {
    ai: DB_NAMES.AI,
    chain: CHAIN_DB,
    chains: CHAIN_DB,
    "chain-steps": CHAIN_DB,
    "game-ids": STATIC_DB_NAMES.GAME_IDS,
    gameids: STATIC_DB_NAMES.GAME_IDS,
    catalog: STATIC_DB_NAMES.GAME_IDS,
    [CLAN_DB]: CLAN_DB,
};

export function resolveDbName(name: string): string | null {
    const lower = name.toLowerCase();
    for (const db of STATIC_ALLOWED_DBS) if (db === lower) return db;
    if (lower.startsWith(PLUGIN_DB_PREFIX)) {
        const mode = lower.slice(PLUGIN_DB_PREFIX.length);
        if (!mode) return null;
        return `${PLUGIN_DB_PREFIX}${mode}`;
    }
    return DB_ALIASES[lower] ?? null;
}

function executeQuery(q: DbQuery, ctx: QueryContext): QueryResult {
    const resolved = resolveDbName(q.db);
    if (!resolved) {
        const hint = `Unknown database "${q.db}". Available: ${STATIC_ALLOWED_DBS.join(", ")}, ${CLAN_DB} (with 'clan' field), ${PLUGIN_DB_PREFIX}<mode> (with 'clan' field)`;
        return queryResult(q.db, q.sql, [], hint);
    }

    if (!isReadOnly(q.sql)) {
        return queryResult(resolved, q.sql, [], "Only SELECT queries are allowed. Write operations are blocked.");
    }

    if (resolved === CHAIN_DB) return executeChainQuery(ctx.siteAccountId, q.sql);
    if (resolved === CLAN_DB) return executeClanQuery(q.sql, ctx, q.clan);
    if (resolved.startsWith(PLUGIN_DB_PREFIX)) return executePluginQuery(resolved, q.sql, ctx, q.clan);

    try {
        const db = STATIC_CATALOG_DBS.has(resolved) ? getStaticDb(resolved) : getDb(resolved);
        const rows = db.prepare(q.sql).all() as Record<string, unknown>[];
        const limited = rows.slice(0, MAX_ROWS);
        const truncated =
            rows.length > MAX_ROWS ? `Results truncated to ${MAX_ROWS} rows (${rows.length} total)` : null;
        return queryResult(resolved, q.sql, limited, truncated);
    } catch (err) {
        return queryResult(resolved, q.sql, [], (err as Error).message);
    }
}

export function executeQueries(queries: DbQuery[], ctx: QueryContext): QueryResult[] {
    return queries.map((q) => executeQuery(q, ctx));
}

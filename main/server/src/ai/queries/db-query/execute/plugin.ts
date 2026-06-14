import { getClanBySlug, getClanPluginDb, listClanPluginModes, PLUGIN_DB_PREFIX } from "../../../../database/index.js";
import { resolveClanPosture } from "../../../../database/clans/access/clan-access-helpers.js";
import { setupPluginViews } from "../../plugin-views.js";
import { MAX_ROWS, queryResult, type QueryContext, type QueryResult } from "../types.js";

export function executePluginQuery(
    resolved: string,
    sql: string,
    ctx: QueryContext,
    clanSlug: string | undefined,
): QueryResult {
    if (typeof clanSlug !== "string" || clanSlug.length === 0) {
        return queryResult(
            resolved,
            sql,
            [],
            `plugin queries require a 'clan' field naming which clan to query. example: { db: "${resolved}", clan: "<slug>", sql: "..." }`,
        );
    }
    const clan = getClanBySlug(clanSlug);
    if (clan === null || clan.archived_at !== null) {
        return queryResult(resolved, sql, [], `unknown clan '${clanSlug}'`, clanSlug);
    }
    const posture = resolveClanPosture(ctx.siteAccountId, clan.id);
    if (posture === null) {
        return queryResult(resolved, sql, [], `no read access to clan '${clanSlug}'`, clanSlug);
    }
    const mode = resolved.slice(PLUGIN_DB_PREFIX.length);
    if (!listClanPluginModes(clan.id).includes(mode)) {
        return queryResult(resolved, sql, [], `clan '${clanSlug}' has no '${mode}' plugin db`, clanSlug);
    }
    const db = getClanPluginDb(clan.id, mode);
    setupPluginViews(db, posture);
    try {
        const rows = db.prepare(sql).all() as Record<string, unknown>[];
        const limited = rows.slice(0, MAX_ROWS);
        const truncated =
            rows.length > MAX_ROWS ? `Results truncated to ${MAX_ROWS} rows (${rows.length} total)` : null;
        return queryResult(resolved, sql, limited, truncated, clanSlug);
    } catch (err) {
        return queryResult(resolved, sql, [], (err as Error).message, clanSlug);
    }
}

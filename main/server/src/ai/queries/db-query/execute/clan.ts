import { getClanBySlug, getClanDb } from "../../../../database/index.js";
import { resolveClanPosture } from "../../../../database/clans/access/clan-access-helpers.js";
import { CLAN_DB, MAX_ROWS, queryResult, type QueryContext, type QueryResult } from "../types.js";

export function executeClanQuery(sql: string, ctx: QueryContext, clanSlug: string | undefined): QueryResult {
    if (typeof clanSlug !== "string" || clanSlug.length === 0) {
        return queryResult(
            CLAN_DB,
            sql,
            [],
            `clan queries require a 'clan' field naming which clan to query. example: { db: "${CLAN_DB}", clan: "<slug>", sql: "..." }`,
        );
    }
    const clan = getClanBySlug(clanSlug);
    if (clan === null || clan.archived_at !== null) {
        return queryResult(CLAN_DB, sql, [], `unknown clan '${clanSlug}'`, clanSlug);
    }
    const posture = resolveClanPosture(ctx.siteAccountId, clan.id);
    if (posture === null) {
        return queryResult(CLAN_DB, sql, [], `no read access to clan '${clanSlug}'`, clanSlug);
    }
    try {
        const rows = getClanDb(clan.id).prepare(sql).all() as Record<string, unknown>[];
        const limited = rows.slice(0, MAX_ROWS);
        const truncated =
            rows.length > MAX_ROWS ? `Results truncated to ${MAX_ROWS} rows (${rows.length} total)` : null;
        return queryResult(CLAN_DB, sql, limited, truncated, clanSlug);
    } catch (err) {
        return queryResult(CLAN_DB, sql, [], (err as Error).message, clanSlug);
    }
}

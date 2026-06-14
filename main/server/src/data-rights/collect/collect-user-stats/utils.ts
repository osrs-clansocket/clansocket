import { DB_NAMES, getDb } from "../../../database/index.js";
import { OAUTH_PROVIDER_DISCORD } from "../../../auth/oauth-providers.js";
import type { TableStat, UserDataStats } from "./types.js";

export function acc(stats: UserDataStats, dbsTouched: Set<string>, dbKey: string, one: TableStat): void {
    if (one.rows === 0 && one.bytes === 0) return;
    stats.totalRows += one.rows;
    stats.totalBytes += one.bytes;
    dbsTouched.add(dbKey);
    if (one.minTs !== null && (stats.firstEntryAt === null || one.minTs < stats.firstEntryAt)) {
        stats.firstEntryAt = one.minTs;
    }
}

export function listAllClanIds(): string[] {
    const db = getDb(DB_NAMES.APP);
    return (db.prepare(`SELECT id FROM clansocket_clans`).all() as Array<{ id: string }>).map((r) => r.id);
}

export function discordUserIdFor(siteAccountId: string): string | null {
    const appDb = getDb(DB_NAMES.APP);
    const row = appDb
        .prepare(`SELECT provider, provider_user_id FROM clansocket_accounts WHERE id = ?`)
        .get(siteAccountId) as { provider: string; provider_user_id: string } | undefined;
    if (!row || row.provider !== OAUTH_PROVIDER_DISCORD) return null;
    return row.provider_user_id;
}

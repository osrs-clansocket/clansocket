import { DB_NAMES, getClanDb, getDb } from "../core/database.js";

export function lookupRsnForHash(clanId: string, accountHash: string): string | null {
    const row = getClanDb(clanId)
        .prepare("SELECT latest_rsn FROM clan_accounts WHERE account_hash = ?")
        .get(accountHash) as { latest_rsn: string } | undefined;
    return row?.latest_rsn ?? null;
}

export function lookupVerifiedRsnForHash(accountHash: string): string | null {
    const row = getDb(DB_NAMES.APP)
        .prepare(
            `SELECT rsn FROM clansocket_account_rsns
             WHERE account_hash = ?
             ORDER BY last_seen DESC
             LIMIT 1`,
        )
        .get(accountHash) as { rsn: string } | undefined;
    return row?.rsn ?? null;
}

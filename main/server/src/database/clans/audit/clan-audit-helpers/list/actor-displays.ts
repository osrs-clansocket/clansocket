import { DB_NAMES, getClanPluginDb, getDb, listClanPluginModes } from "../../../../core/database.js";

export function resolveActorDisplays(clanId: string, siteAccountIds: readonly string[]): Map<string, string> {
    const out = new Map<string, string>();
    if (siteAccountIds.length === 0) return out;
    const placeholders = siteAccountIds.map(() => "?").join(",");
    const appDb = getDb(DB_NAMES.APP);

    const accountRows = appDb
        .prepare(
            `SELECT id, COALESCE(display_name, '') AS label
             FROM clansocket_accounts WHERE id IN (${placeholders})`,
        )
        .all(...siteAccountIds) as Array<{ id: string; label: string }>;
    const accountLabels = new Map<string, string>();
    for (const row of accountRows) {
        if (row.label.length > 0) accountLabels.set(row.id, row.label);
    }

    const bindingRows = appDb
        .prepare(
            `SELECT site_account_id, account_hash
             FROM clansocket_account_bindings
             WHERE site_account_id IN (${placeholders}) AND revoked_at IS NULL`,
        )
        .all(...siteAccountIds) as Array<{ site_account_id: string; account_hash: string }>;
    const hashesByAccount = new Map<string, string[]>();
    const allHashes = new Set<string>();
    for (const row of bindingRows) {
        const list = hashesByAccount.get(row.site_account_id) ?? [];
        list.push(row.account_hash);
        hashesByAccount.set(row.site_account_id, list);
        allHashes.add(row.account_hash);
    }

    const rsnByHash = new Map<string, { rsn: string; lastSeen: number }>();
    if (allHashes.size > 0) {
        const hashList = Array.from(allHashes);
        const hashPlaceholders = hashList.map(() => "?").join(",");
        for (const mode of listClanPluginModes(clanId)) {
            const pluginDb = getClanPluginDb(clanId, mode);
            const rows = pluginDb
                .prepare(
                    `SELECT account_hash, latest_rsn, last_seen
                     FROM plugin_accounts WHERE account_hash IN (${hashPlaceholders})`,
                )
                .all(...hashList) as Array<{ account_hash: string; latest_rsn: string; last_seen: number }>;
            for (const row of rows) {
                const prior = rsnByHash.get(row.account_hash);
                if (!prior || row.last_seen > prior.lastSeen) {
                    rsnByHash.set(row.account_hash, { rsn: row.latest_rsn, lastSeen: row.last_seen });
                }
            }
        }
    }

    for (const id of siteAccountIds) {
        const hashes = hashesByAccount.get(id) ?? [];
        let bestRsn: { rsn: string; lastSeen: number } | null = null;
        for (const h of hashes) {
            const candidate = rsnByHash.get(h);
            if (candidate && (!bestRsn || candidate.lastSeen > bestRsn.lastSeen)) bestRsn = candidate;
        }
        if (bestRsn) {
            out.set(id, bestRsn.rsn);
            continue;
        }
        const label = accountLabels.get(id);
        if (label) out.set(id, label);
    }
    return out;
}

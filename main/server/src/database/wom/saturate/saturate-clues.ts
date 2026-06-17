import { getClanPluginDb } from "../../core/database.js";

export interface WomClueRow {
    accountHash: string;
    rsn: string;
    tier: string;
    count: number;
    lastChangedAtMs: number;
}

const UPSERT_SQL = `INSERT INTO plugin_clues (
    account_hash, rsn, tier,
    count, count_source, count_updated_at,
    first_seen, last_seen, updated_at
) VALUES ($accountHash, $rsn, $tier, $count, 'wom', $changedAt, $now, $now, $now)
ON CONFLICT(account_hash, tier) DO UPDATE SET
    rsn = excluded.rsn,
    count = CASE
        WHEN plugin_clues.count_updated_at IS NOT NULL
            AND plugin_clues.count_updated_at >= excluded.count_updated_at
        THEN plugin_clues.count
        ELSE MAX(plugin_clues.count, excluded.count)
    END,
    count_source = CASE
        WHEN plugin_clues.count_updated_at IS NOT NULL
            AND plugin_clues.count_updated_at >= excluded.count_updated_at
        THEN COALESCE(plugin_clues.count_source, 'plugin')
        WHEN excluded.count > plugin_clues.count
        THEN 'wom'
        ELSE COALESCE(plugin_clues.count_source, 'plugin')
    END,
    count_updated_at = CASE
        WHEN plugin_clues.count_updated_at IS NOT NULL
            AND plugin_clues.count_updated_at >= excluded.count_updated_at
        THEN plugin_clues.count_updated_at
        WHEN excluded.count > plugin_clues.count
        THEN excluded.count_updated_at
        ELSE plugin_clues.count_updated_at
    END,
    last_seen = excluded.last_seen,
    updated_at = excluded.updated_at`;

function normalizeTier(tier: string): string {
    return tier.trim().toLowerCase();
}

export function saturateCluesFromWom(clanId: string, mode: string, rows: readonly WomClueRow[]): number {
    if (rows.length === 0) return 0;
    const db = getClanPluginDb(clanId, mode);
    const stmt = db.prepare(UPSERT_SQL);
    const now = Date.now();
    db.transaction(() => {
        for (const row of rows) {
            stmt.run({
                accountHash: row.accountHash,
                rsn: row.rsn,
                tier: normalizeTier(row.tier),
                count: row.count,
                changedAt: row.lastChangedAtMs > 0 ? row.lastChangedAtMs : now,
                now,
            });
        }
    })();
    return rows.length;
}

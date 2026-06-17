import { getClanPluginDb } from "../../core/database.js";

export interface WomBossRow {
    accountHash: string;
    rsn: string;
    slug: string;
    sourceName: string;
    kc: number;
    lastChangedAtMs: number;
}

const JAVA_HASH_PRIME = 31;
const NEGATIVE_FLIP_OFFSET = 1;

export function slugToSyntheticSourceId(slug: string): number {
    let h = 0;
    const normalized = slug.trim().toLowerCase();
    for (let i = 0; i < normalized.length; i++) {
        h = (h * JAVA_HASH_PRIME + normalized.charCodeAt(i)) | 0;
    }
    return h >= 0 ? -NEGATIVE_FLIP_OFFSET - h : h;
}

const PLUGIN_EXISTS_SQL = `SELECT 1 FROM plugin_npc_kc
WHERE account_hash = ? AND source_id > 0 AND source_name = ? COLLATE NOCASE LIMIT 1`;

const UPSERT_SQL = `INSERT INTO plugin_npc_kc (
    account_hash, rsn, source_id, source_name,
    kc, kc_source, kc_updated_at,
    first_seen, last_seen, updated_at
) VALUES ($accountHash, $rsn, $sourceId, $sourceName, $kc, 'wom', $changedAt, $now, $now, $now)
ON CONFLICT(account_hash, source_id) DO UPDATE SET
    rsn = excluded.rsn,
    source_name = excluded.source_name,
    kc = CASE
        WHEN plugin_npc_kc.kc_updated_at IS NOT NULL
            AND plugin_npc_kc.kc_updated_at >= excluded.kc_updated_at
        THEN plugin_npc_kc.kc
        ELSE MAX(plugin_npc_kc.kc, excluded.kc)
    END,
    kc_source = CASE
        WHEN plugin_npc_kc.kc_updated_at IS NOT NULL
            AND plugin_npc_kc.kc_updated_at >= excluded.kc_updated_at
        THEN COALESCE(plugin_npc_kc.kc_source, 'plugin')
        WHEN excluded.kc > plugin_npc_kc.kc
        THEN 'wom'
        ELSE COALESCE(plugin_npc_kc.kc_source, 'plugin')
    END,
    kc_updated_at = CASE
        WHEN plugin_npc_kc.kc_updated_at IS NOT NULL
            AND plugin_npc_kc.kc_updated_at >= excluded.kc_updated_at
        THEN plugin_npc_kc.kc_updated_at
        WHEN excluded.kc > plugin_npc_kc.kc
        THEN excluded.kc_updated_at
        ELSE plugin_npc_kc.kc_updated_at
    END,
    last_seen = excluded.last_seen,
    updated_at = excluded.updated_at`;

export function saturateBossesFromWom(clanId: string, mode: string, rows: readonly WomBossRow[]): number {
    if (rows.length === 0) return 0;
    const db = getClanPluginDb(clanId, mode);
    const stmt = db.prepare(UPSERT_SQL);
    const pluginExists = db.prepare(PLUGIN_EXISTS_SQL);
    const now = Date.now();
    let written = 0;
    db.transaction(() => {
        for (const row of rows) {
            if (pluginExists.get(row.accountHash, row.sourceName) !== undefined) continue;
            stmt.run({
                accountHash: row.accountHash,
                rsn: row.rsn,
                sourceId: slugToSyntheticSourceId(row.slug),
                sourceName: row.sourceName,
                kc: row.kc,
                changedAt: row.lastChangedAtMs > 0 ? row.lastChangedAtMs : now,
                now,
            });
            written += 1;
        }
    })();
    return written;
}

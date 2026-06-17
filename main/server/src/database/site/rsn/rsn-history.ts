import { DB_NAMES, getDb } from "../../core/database.js";
import type { PluginIdentityRecord } from "../../plugin/helpers/identity/types.js";

export function upsertRsnHistory(identity: PluginIdentityRecord, now: number): void {
    getDb(DB_NAMES.APP)
        .prepare(
            `INSERT INTO clansocket_account_rsns
                (account_hash, rsn, source, current_rank, first_seen, last_seen, verified_at)
             VALUES ($accountHash, $rsn, 'plugin', $rank, $now, $now, $now)
             ON CONFLICT (account_hash, rsn) DO UPDATE SET
                source = excluded.source,
                current_rank = COALESCE(excluded.current_rank, current_rank),
                last_seen = excluded.last_seen,
                verified_at = excluded.verified_at`,
        )
        .run({ accountHash: identity.accountHash, rsn: identity.rsn, rank: identity.clanRank ?? null, now });
}

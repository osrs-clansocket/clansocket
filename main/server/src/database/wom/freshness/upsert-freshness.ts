import { getClanDb } from "../../core/database.js";

const UPSERT_SQL = `INSERT INTO clan_wom_player_freshness (
    account_hash, wom_player_id, last_wom_updated_at, last_saturated_at, set_at, updated_at
) VALUES ($accountHash, $womPlayerId, $lastWomUpdatedAt, $now, $now, $now)
ON CONFLICT(account_hash) DO UPDATE SET
    wom_player_id = excluded.wom_player_id,
    last_wom_updated_at = excluded.last_wom_updated_at,
    last_saturated_at = excluded.last_saturated_at`;

export function upsertPlayerFreshness(
    clanId: string,
    accountHash: string,
    womPlayerId: number | null,
    lastWomUpdatedAt: number,
): void {
    const now = Date.now();
    getClanDb(clanId).prepare(UPSERT_SQL).run({ accountHash, womPlayerId, lastWomUpdatedAt, now });
}

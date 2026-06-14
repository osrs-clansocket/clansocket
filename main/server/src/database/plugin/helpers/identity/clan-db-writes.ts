import type Database from "better-sqlite3";
import type { PluginIdentityRecord } from "./types.js";

export function upsertClanMemberHistory(
    clanDb: Database.Database,
    clanId: string,
    identity: PluginIdentityRecord,
    now: number,
): void {
    if (!identity.clanName) return;
    clanDb
        .prepare(
            `INSERT INTO clan_member_history
            (account_hash, rsn, clan_id, clan_name, rank, joined_at, first_seen, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_hash, clan_id) DO UPDATE SET
            rsn = excluded.rsn,
            clan_name = excluded.clan_name,
            rank = COALESCE(excluded.rank, rank),
            joined_at = COALESCE(excluded.joined_at, joined_at),
            last_seen = excluded.last_seen`,
        )
        .run(
            identity.accountHash,
            identity.rsn,
            clanId,
            identity.clanName,
            identity.clanRank ?? null,
            identity.clanJoinedAt ?? null,
            now,
            now,
        );
}

export function maybeWriteClanSnapshot(
    clanDb: Database.Database,
    clanId: string,
    identity: PluginIdentityRecord,
    now: number,
): void {
    if (
        identity.clanName &&
        identity.clanMemberCount !== null &&
        identity.clanMemberCount !== undefined &&
        identity.clanOnlineCount !== null &&
        identity.clanOnlineCount !== undefined
    ) {
        clanDb
            .prepare(
                `INSERT INTO clan_snapshots
                (account_hash, rsn, clan_id, clan_name, member_count, online_count, observed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (account_hash, observed_at) DO NOTHING`,
            )
            .run(
                identity.accountHash,
                identity.rsn,
                clanId,
                identity.clanName,
                identity.clanMemberCount,
                identity.clanOnlineCount,
                now,
            );
    }
}

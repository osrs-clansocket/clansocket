import { DB_NAMES, getClanDb, getDb } from "../../../core/database.js";
import { lookupVerifiedRsnForHash } from "../../../plugin/plugin-rsn-lookup.js";
import { canonicalRsn } from "../../../site/rsn/canonicalize.js";
import { ClanAuditActions } from "../../audit/clan-audit-actions.js";
import { recordClanAudit } from "../../audit/clan-audit-helpers/record.js";
import { pruneOldClanAuditEntries } from "../../audit/clan-audit-helpers/retention.js";
import { diffRosters } from "./diffs.js";
import { normalizeRsn, verifiedHashByNormalizedName } from "./lookups.js";
import type { ClanRosterMember } from "./types.js";

export function recordClanRoster(
    clanId: string,
    capturedByAccountHash: string,
    fingerprint: string,
    members: ClanRosterMember[],
): { stored: boolean; diffCount: number } {
    const db = getClanDb(clanId);
    const now = Date.now();
    const previous = db
        .prepare("SELECT fingerprint, members_json FROM clan_rosters ORDER BY captured_at DESC LIMIT 1")
        .get() as { fingerprint: string; members_json: string } | undefined;

    const capturedByRsn = lookupVerifiedRsnForHash(capturedByAccountHash);
    const clanName =
        (
            getDb(DB_NAMES.APP).prepare("SELECT display_name FROM clansocket_clans WHERE id = ?").get(clanId) as
                | { display_name: string }
                | undefined
        )?.display_name ?? "";

    const verifiedHash = verifiedHashByNormalizedName();
    for (const m of members) {
        m.name = canonicalRsn(m.name);
        m.accountHash = verifiedHash.get(normalizeRsn(m.name)) ?? null;
    }

    let diffCount = 0;
    db.transaction(() => {
        db.prepare(
            `INSERT INTO clan_rosters (fingerprint, captured_at, captured_by_account_hash, captured_by_rsn, member_count, members_json)
             VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(fingerprint, now, capturedByAccountHash, capturedByRsn, members.length, JSON.stringify(members));

        db.prepare(
            `INSERT INTO clan_snapshots (account_hash, rsn, clan_id, clan_name, member_count, online_count, observed_at)
             VALUES (?, ?, ?, ?, ?, NULL, ?)
             ON CONFLICT (account_hash, observed_at) DO NOTHING`,
        ).run(capturedByAccountHash, capturedByRsn ?? "", clanId, clanName, members.length, now);

        const upsertMember = db.prepare(
            `INSERT INTO clan_members (member_name, account_hash, rank, joined_at, first_observed_at, last_observed_at)
             VALUES ($memberName, $accountHash, $rank, $joinedAt, $now, $now)
             ON CONFLICT(member_name) DO UPDATE SET
               account_hash = excluded.account_hash,
               rank = excluded.rank,
               joined_at = COALESCE(excluded.joined_at, clan_members.joined_at),
               last_observed_at = excluded.last_observed_at`,
        );
        for (const m of members) {
            upsertMember.run({
                memberName: m.name,
                accountHash: m.accountHash ?? null,
                rank: m.rank ?? null,
                joinedAt: m.joinedAt ?? null,
                now,
            });
        }

        if (previous && previous.fingerprint !== fingerprint) {
            const prevMembers = JSON.parse(previous.members_json) as ClanRosterMember[];
            const events = diffRosters(prevMembers, members);
            const stmt = db.prepare(
                `INSERT INTO clan_roster_diffs (from_fingerprint, to_fingerprint, event_type, member_name, old_value, new_value, detected_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
            );
            for (const e of events) {
                stmt.run(previous.fingerprint, fingerprint, e.event_type, e.member_name, e.old_value, e.new_value, now);
            }
            diffCount = events.length;
        }
    })();

    recordClanAudit(clanId, {
        actor: null,
        action: ClanAuditActions.RosterChanged,
        targetId: fingerprint,
        payload: {
            memberCount: members.length,
            diffCount,
            fromFingerprint: previous?.fingerprint ?? null,
            capturedByAccountHash,
        },
    });
    pruneOldClanAuditEntries(clanId);

    return { stored: true, diffCount };
}

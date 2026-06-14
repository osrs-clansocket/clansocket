import { getClanDb } from "../../../core/database.js";
import type { ClanRosterDiff, ClanRosterMember } from "./types.js";

export interface RosterDiffEvent {
    event_type: "member_joined" | "member_left" | "rank_changed";
    member_name: string;
    old_value: string | null;
    new_value: string | null;
}

export function diffRosters(prev: ClanRosterMember[], next: ClanRosterMember[]): RosterDiffEvent[] {
    const prevByName = new Map(prev.map((m) => [m.name, m]));
    const nextByName = new Map(next.map((m) => [m.name, m]));
    const events: RosterDiffEvent[] = [];

    for (const [name, member] of nextByName) {
        const before = prevByName.get(name);
        if (!before) {
            events.push({ event_type: "member_joined", member_name: name, old_value: null, new_value: member.rank });
            continue;
        }
        if ((before.rank ?? "") !== (member.rank ?? "")) {
            events.push({
                event_type: "rank_changed",
                member_name: name,
                old_value: before.rank,
                new_value: member.rank,
            });
        }
    }
    for (const [name, member] of prevByName) {
        if (!nextByName.has(name)) {
            events.push({ event_type: "member_left", member_name: name, old_value: member.rank, new_value: null });
        }
    }
    return events;
}

export function listRosterDiffsForFingerprint(clanId: string, toFingerprint: string): ClanRosterDiff[] {
    const db = getClanDb(clanId);
    const rows = db
        .prepare(
            `SELECT event_type, member_name, old_value, new_value, detected_at
             FROM clan_roster_diffs
             WHERE to_fingerprint = ?
             ORDER BY id ASC`,
        )
        .all(toFingerprint) as Array<{
        event_type: "member_joined" | "member_left" | "rank_changed";
        member_name: string;
        old_value: string | null;
        new_value: string | null;
        detected_at: number;
    }>;
    return rows.map((r) => ({
        eventType: r.event_type,
        memberName: r.member_name,
        oldValue: r.old_value,
        newValue: r.new_value,
        detectedAt: r.detected_at,
    }));
}

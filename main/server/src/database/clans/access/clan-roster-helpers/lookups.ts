import { DB_NAMES, getClanDb, getDb } from "../../../core/database.js";
import { exists } from "../../../core/db-helpers.js";

const NBSP = "\u00a0";

export function normalizeRsn(s: string): string {
    return s.split(NBSP).join(" ").toLowerCase().trim();
}

export function verifiedHashByNormalizedName(): Map<string, string> {
    const rows = getDb(DB_NAMES.APP).prepare(`SELECT account_hash, rsn FROM clansocket_account_rsns`).all() as {
        account_hash: string;
        rsn: string;
    }[];
    const map = new Map<string, string>();
    for (const row of rows) {
        const key = normalizeRsn(row.rsn);
        if (!map.has(key)) map.set(key, row.account_hash);
    }
    return map;
}

export function isMemberInClanRoster(clanId: string, memberName: string): boolean {
    return exists(
        getClanDb(clanId),
        "SELECT 1 FROM clan_members WHERE LOWER(member_name) = LOWER(?) LIMIT 1",
        memberName,
    );
}

export function getRosterRank(clanId: string, memberName: string): string | null {
    try {
        const row = getClanDb(clanId)
            .prepare("SELECT rank FROM clan_members WHERE LOWER(member_name) = LOWER(?) LIMIT 1")
            .get(memberName) as { rank: string | null } | undefined;
        return row?.rank ?? null;
    } catch {
        return null;
    }
}

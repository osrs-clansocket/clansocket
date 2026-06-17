import { getClanDb } from "../../core/database.js";

const COUNT_SQL = "SELECT COUNT(*) AS count FROM clan_members";

export function lookupClanMemberCount(clanId: string): number | null {
    try {
        const db = getClanDb(clanId);
        const row = db.prepare(COUNT_SQL).get() as { count: number } | undefined;
        return row?.count ?? null;
    } catch {
        return null;
    }
}

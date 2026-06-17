import { getClanDb } from "../../core/database.js";

const DELETE_SQL = `DELETE FROM clan_wom_identity WHERE singleton_key = 'default'`;

export function clearClanWomIdentity(clanId: string): boolean {
    const result = getClanDb(clanId).prepare(DELETE_SQL).run();
    return result.changes > 0;
}

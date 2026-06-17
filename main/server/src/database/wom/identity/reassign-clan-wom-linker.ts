import { getClanDb } from "../../core/database.js";

const UPDATE_SQL = `UPDATE clan_wom_identity
    SET linker_site_account_id = ?
    WHERE singleton_key = 'default'`;

export function reassignClanWomLinker(clanId: string, newLinkerSiteAccountId: string): boolean {
    const result = getClanDb(clanId).prepare(UPDATE_SQL).run(newLinkerSiteAccountId);
    return result.changes > 0;
}

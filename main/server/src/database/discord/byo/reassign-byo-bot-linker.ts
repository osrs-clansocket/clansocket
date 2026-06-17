import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

const OWNER_KIND_BYO = "byo";

const SQL = `UPDATE discord_bot_identities
    SET owner_site_account_id = ?, updated_at = ?
    WHERE owner_kind = ? AND clan_id = ?`;

interface ReassignParams {
    clanId: string;
    newLinkerSiteAccountId: string;
}

export function reassignByoBotLinker(params: ReassignParams): boolean {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const result = db.prepare(SQL).run(params.newLinkerSiteAccountId, Date.now(), OWNER_KIND_BYO, params.clanId);
    return result.changes > 0;
}

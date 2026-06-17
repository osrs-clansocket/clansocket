import { getClanDb } from "../../core/database.js";

const SELECT_SQL = "SELECT account_type FROM clan_accounts WHERE latest_rsn = ? OR first_rsn = ? LIMIT 1";

export function lookupAccountType(clanId: string, rsn: string): string | null {
    if (rsn.length === 0) return null;
    const db = getClanDb(clanId);
    const row = db.prepare(SELECT_SQL).get(rsn, rsn) as { account_type: string | null } | undefined;
    if (row?.account_type !== undefined && row.account_type !== null && row.account_type.length > 0) {
        return row.account_type;
    }
    return null;
}

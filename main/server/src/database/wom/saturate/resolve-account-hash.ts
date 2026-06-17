import { getClanDb } from "../../core/database.js";
import { buildPlaceholderAccountHash } from "../../../wom/builders/placeholder-hash-builder.js";

interface ClanAccountRow {
    account_hash: string;
}

const LOOKUP_SQL = `SELECT account_hash FROM clan_accounts WHERE latest_rsn = ? COLLATE NOCASE LIMIT 1`;

export function resolveAccountHashByRsn(clanId: string, womGroupId: number, rsn: string): string {
    const row = getClanDb(clanId).prepare(LOOKUP_SQL).get(rsn) as ClanAccountRow | undefined;
    if (row !== undefined) return row.account_hash;
    return buildPlaceholderAccountHash(womGroupId, rsn.toLowerCase());
}

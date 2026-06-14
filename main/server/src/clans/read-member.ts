import { DB_NAMES, getClanDb, getDb } from "../database/index.js";
import { listClanManagersForAccount } from "../database/clans/access/clan-manager-helpers.js";
import { listAccountHashesForSiteAccount } from "../database/site/site-account-helpers/index.js";
import { buildClanView, type ClanRow, type ManagedClanView } from "./clan-view-builder.js";

const MEMBER_ROLE = "member";
const MEMBER_GRANTED_VIA = "member";
const MEMBER_GRANTED_AT = 0;

function hasCurrentRosterRow(clanId: string, hashes: readonly string[]): boolean {
    if (hashes.length === 0) return false;
    const ph = hashes.map(() => "?").join(",");
    const row = getClanDb(clanId)
        .prepare(`SELECT 1 FROM clan_members WHERE account_hash IN (${ph}) LIMIT 1`)
        .get(...hashes);
    return Boolean(row);
}

export function listMemberClans(siteAccountId: string): ManagedClanView[] {
    const hashes = listAccountHashesForSiteAccount(siteAccountId);
    if (hashes.length === 0) return [];
    const managedIds = new Set(listClanManagersForAccount(siteAccountId).map((m) => m.clan_id));
    const rows = getDb(DB_NAMES.APP)
        .prepare(
            `SELECT id, slug, display_name, status, icon_kind, icon_value, color, created_at
             FROM clansocket_clans
             WHERE status = 'active' AND archived_at IS NULL AND claimed_at IS NOT NULL`,
        )
        .all() as ClanRow[];
    const out: ManagedClanView[] = [];
    for (const row of rows) {
        if (managedIds.has(row.id)) continue;
        if (!hasCurrentRosterRow(row.id, hashes)) continue;
        out.push(buildClanView(row, MEMBER_ROLE, MEMBER_GRANTED_VIA, MEMBER_GRANTED_AT));
    }
    out.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return out;
}

import { DB_NAMES } from "../../database/core/database-state.js";
import { getDb } from "../../database/core/database.js";

interface OwnerRow {
    owner_site_account_id: string | null;
}

export function getClanOwnerSiteAccountId(clanId: string): string | null {
    const db = getDb(DB_NAMES.APP);
    const row = db.prepare("SELECT owner_site_account_id FROM clansocket_clans WHERE id = ?").get(clanId) as
        | OwnerRow
        | undefined;
    return row?.owner_site_account_id ?? null;
}

export function isActorClanOwner(siteAccountId: string, clanId: string): boolean {
    return siteAccountId === getClanOwnerSiteAccountId(clanId);
}

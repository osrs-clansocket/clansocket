import { getClanDb } from "../../core/database.js";

export interface ClanWomIdentityRow {
    linker_site_account_id: string;
    wom_group_id: number;
    cached_group_name: string;
    last_backfill_at: number | null;
    last_backfill_status: string | null;
    next_backfill_eligible_at: number | null;
    set_at: number;
    updated_at: number;
}

const SELECT_SQL = `SELECT linker_site_account_id, wom_group_id, cached_group_name,
                           last_backfill_at, last_backfill_status, next_backfill_eligible_at,
                           set_at, updated_at
                    FROM clan_wom_identity WHERE singleton_key = 'default'`;

export function getClanWomIdentity(clanId: string): ClanWomIdentityRow | null {
    const row = getClanDb(clanId).prepare(SELECT_SQL).get() as ClanWomIdentityRow | undefined;
    return row ?? null;
}

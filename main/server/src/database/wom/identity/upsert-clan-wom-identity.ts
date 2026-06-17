import { getClanDb } from "../../core/database.js";

export interface UpsertClanWomIdentityParams {
    clanId: string;
    linkerSiteAccountId: string;
    womGroupId: number;
    cachedGroupName: string;
}

const UPSERT_SQL = `INSERT INTO clan_wom_identity (
    singleton_key, linker_site_account_id, wom_group_id, cached_group_name, set_at, updated_at
) VALUES ('default', $linkerSiteAccountId, $womGroupId, $cachedGroupName, $now, $now)
ON CONFLICT(singleton_key) DO UPDATE SET
    wom_group_id = excluded.wom_group_id,
    cached_group_name = excluded.cached_group_name,
    updated_at = excluded.updated_at`;

export function upsertClanWomIdentity(params: UpsertClanWomIdentityParams): void {
    getClanDb(params.clanId).prepare(UPSERT_SQL).run({
        linkerSiteAccountId: params.linkerSiteAccountId,
        womGroupId: params.womGroupId,
        cachedGroupName: params.cachedGroupName,
        now: Date.now(),
    });
}

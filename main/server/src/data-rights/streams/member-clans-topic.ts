import { listMemberClans } from "../../clans/read-member.js";
import { getDb, DB_NAMES, getClanDb } from "../../database/index.js";
import { listAccountHashesForSiteAccount } from "../../database/site/site-account-helpers/index.js";
import { SCOPE_APP } from "../scopes/user-scope/index.js";
import type { ProjectionTopic, ProjectionTrigger } from "./projection.js";
import { scopeKeyForClan } from "./writes-stream.js";

interface ClanIdRow {
    id: string;
}

// the clans the user is a roster-member of (excluding clans they manage, which the
// "clans" topic covers). seeded per-clan triggers fire at subscribe time from the
// current member set; joining a new clan mid-subscription requires a resubscribe.
export function memberClansTopic(siteAccountId: string): ProjectionTopic {
    const triggers: ProjectionTrigger[] = [
        { scopeKey: SCOPE_APP, table: "clansocket_clans" },
        { scopeKey: SCOPE_APP, table: "clansocket_account_bindings" },
    ];
    const hashes = listAccountHashesForSiteAccount(siteAccountId);
    if (hashes.length > 0) {
        const ph = hashes.map(() => "?").join(",");
        const clanRows = getDb(DB_NAMES.APP)
            .prepare(
                `SELECT id FROM clansocket_clans
                 WHERE status = 'active' AND archived_at IS NULL AND claimed_at IS NOT NULL`,
            )
            .all() as ClanIdRow[];
        for (const c of clanRows) {
            const memberRow = getClanDb(c.id)
                .prepare(`SELECT 1 FROM clan_members WHERE account_hash IN (${ph}) LIMIT 1`)
                .get(...hashes);
            if (memberRow) {
                triggers.push({ scopeKey: scopeKeyForClan(c.id), table: "clan_rosters" });
            }
        }
    }
    return {
        triggers,
        query: () => listMemberClans(siteAccountId) as unknown as Record<string, unknown>[],
        keyOf: (row) => String(row.id),
    };
}

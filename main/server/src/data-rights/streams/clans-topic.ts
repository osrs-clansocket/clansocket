import { listClanManagersForAccount } from "../../database/clans/access/clan-manager-helpers.js";
import { listManagedClans } from "../../clans/read-managed.js";
import { SCOPE_APP } from "../scopes/user-scope/index.js";
import type { ProjectionTopic, ProjectionTrigger } from "./projection.js";
import { scopeKeyForClan } from "./writes-stream.js";

// the user's managed clans as a projection topic: recomputed on writes to the clans
// table, the managers table, or any managed clan's roster. roster triggers are seeded
// at subscribe time from the current manager set — if the user joins a new clan mid-
// subscription, the manager-table trigger re-runs query() and the new clan appears,
// but its roster updates wont fire recompute until resubscribe.
export function clansTopic(siteAccountId: string): ProjectionTopic {
    const triggers: ProjectionTrigger[] = [
        { scopeKey: SCOPE_APP, table: "clansocket_clans" },
        { scopeKey: SCOPE_APP, table: "clansocket_clan_managers" },
    ];
    for (const m of listClanManagersForAccount(siteAccountId)) {
        triggers.push({ scopeKey: scopeKeyForClan(m.clan_id), table: "clan_rosters" });
    }
    return {
        triggers,
        query: () => listManagedClans(siteAccountId) as unknown as Record<string, unknown>[],
        keyOf: (row) => String(row.id),
    };
}

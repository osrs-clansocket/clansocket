import { listAccountHashesForSiteAccount } from "../../../database/site/site-account-helpers/index.js";
import {
    CLAN_AUDIT_DB_SITE_ACCOUNT_TABLES,
    CLAN_DB_SITE_ACCOUNT_TABLES,
    CLAN_DB_USER_TABLES,
    PLUGIN_USER_TABLES,
    VAREZ_TABLES_BY_SITE_ACCOUNT,
} from "../manifest/index.js";
import { SCOPE_APP, SCOPE_CLAN, SCOPE_CLAN_AUDIT, SCOPE_PLUGIN, SCOPE_VAREZ, type Scope } from "../user-scope/index.js";
import { clansWithUserPresence } from "./clan-presence.js";
import { appTables, buildTableList, tableHasUserRows } from "./table-presence.js";
import type { ScopeListItem } from "./types.js";

export type { ScopeListItem, ScopeListTable } from "./types.js";
export { canUserSeeScopeKey, scopeFromScopeKey } from "./scope-key.js";
export { tableHasUserRows };

export function listUserScopes(siteAccountId: string): ScopeListItem[] {
    const appScope: Scope = { kind: SCOPE_APP };
    const varezScope: Scope = { kind: SCOPE_VAREZ };
    const scopes: ScopeListItem[] = [
        { kind: SCOPE_APP, label: "Account", tables: buildTableList(siteAccountId, appScope, appTables()) },
        {
            kind: SCOPE_VAREZ,
            label: "AI history",
            tables: buildTableList(
                siteAccountId,
                varezScope,
                VAREZ_TABLES_BY_SITE_ACCOUNT.map((e) => e.table),
            ),
        },
    ];
    const hashes = listAccountHashesForSiteAccount(siteAccountId);
    for (const { clan, hasClanDb, hasAuditDb, presentModes } of clansWithUserPresence(siteAccountId, hashes)) {
        if (hasClanDb) {
            const sc: Scope = { kind: SCOPE_CLAN, clanId: clan.id };
            scopes.push({
                kind: SCOPE_CLAN,
                label: `Clan · ${clan.display_name}`,
                clanId: clan.id,
                clanSlug: clan.slug,
                tables: buildTableList(siteAccountId, sc, [
                    ...CLAN_DB_USER_TABLES.map((e) => e.table),
                    ...CLAN_DB_SITE_ACCOUNT_TABLES.map((e) => e.table),
                ]),
            });
        }
        if (hasAuditDb) {
            const sc: Scope = { kind: SCOPE_CLAN_AUDIT, clanId: clan.id };
            scopes.push({
                kind: SCOPE_CLAN_AUDIT,
                label: `Audit · ${clan.display_name}`,
                clanId: clan.id,
                clanSlug: clan.slug,
                tables: buildTableList(
                    siteAccountId,
                    sc,
                    CLAN_AUDIT_DB_SITE_ACCOUNT_TABLES.map((e) => e.table),
                ),
            });
        }
        for (const mode of presentModes) {
            const sc: Scope = { kind: SCOPE_PLUGIN, clanId: clan.id, mode };
            scopes.push({
                kind: SCOPE_PLUGIN,
                label: `Plugin · ${clan.display_name} · ${mode}`,
                clanId: clan.id,
                clanSlug: clan.slug,
                mode,
                tables: buildTableList(
                    siteAccountId,
                    sc,
                    PLUGIN_USER_TABLES.map((e) => e.table),
                ),
            });
        }
    }
    return scopes;
}

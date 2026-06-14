import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "better-sqlite3";
import { DB_NAMES, getDb, getClanDb, getClanPluginDb, listClanPluginModes } from "../../../database/index.js";
import { getClanAuditDb, clanDirPath } from "../../../database/core/database.js";
import { OAUTH_PROVIDER_DISCORD } from "../../../auth/oauth-providers.js";
import { SCOPE_APP, SCOPE_CLAN, SCOPE_CLAN_AUDIT, SCOPE_VAREZ, type Scope } from "./scope.js";

export function discordUserIdFor(siteAccountId: string): string | null {
    const row = getDb(DB_NAMES.APP)
        .prepare(`SELECT provider, provider_user_id FROM clansocket_accounts WHERE id = ?`)
        .get(siteAccountId) as { provider: string; provider_user_id: string } | undefined;
    if (!row || row.provider !== OAUTH_PROVIDER_DISCORD) return null;
    return row.provider_user_id;
}

function clanDbExists(clanId: string, leaf: string): boolean {
    return existsSync(resolve(clanDirPath(clanId), leaf));
}

export function openScopeDb(scope: Scope): Database | null {
    if (scope.kind === SCOPE_APP) return getDb(DB_NAMES.APP);
    if (scope.kind === SCOPE_VAREZ) return getDb(DB_NAMES.AI);
    if (scope.kind === SCOPE_CLAN) return clanDbExists(scope.clanId, "clan.db") ? getClanDb(scope.clanId) : null;
    if (scope.kind === SCOPE_CLAN_AUDIT) {
        return clanDbExists(scope.clanId, "clan_audit.db") ? getClanAuditDb(scope.clanId) : null;
    }
    if (!listClanPluginModes(scope.clanId).includes(scope.mode)) return null;
    return getClanPluginDb(scope.clanId, scope.mode);
}

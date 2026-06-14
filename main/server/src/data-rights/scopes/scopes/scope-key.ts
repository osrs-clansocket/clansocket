import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { listClanPluginModes } from "../../../database/index.js";
import { clanDirPath } from "../../../database/core/database.js";
import { listAccountHashesForSiteAccount } from "../../../database/site/site-account-helpers/index.js";
import { SCOPE_APP, SCOPE_CLAN, SCOPE_CLAN_AUDIT, SCOPE_PLUGIN, SCOPE_VAREZ, type Scope } from "../user-scope/index.js";
import { userHasPluginRows, userTouchesAuditDb, userTouchesClanDb } from "./clan-presence.js";

const SIMPLE_SCOPE_KEYS = new Set<string>([SCOPE_APP, SCOPE_VAREZ]);

function parsePrefixed<T extends string>(scopeKey: string, prefix: T): string | null {
    if (!scopeKey.startsWith(prefix)) return null;
    const tail = scopeKey.slice(prefix.length);
    return tail.length === 0 ? null : tail;
}

export function scopeFromScopeKey(scopeKey: string): Scope | null {
    if (SIMPLE_SCOPE_KEYS.has(scopeKey)) {
        return { kind: scopeKey } as Scope;
    }
    const clanIdAlone = parsePrefixed(scopeKey, `${SCOPE_CLAN}:`);
    if (clanIdAlone !== null) return { kind: SCOPE_CLAN, clanId: clanIdAlone };
    const auditClanId = parsePrefixed(scopeKey, `${SCOPE_CLAN_AUDIT}:`);
    if (auditClanId !== null) return { kind: SCOPE_CLAN_AUDIT, clanId: auditClanId };
    const pluginTail = parsePrefixed(scopeKey, `${SCOPE_PLUGIN}:`);
    if (pluginTail !== null) {
        const colon = pluginTail.indexOf(":");
        if (colon === -1) return null;
        const clanId = pluginTail.slice(0, colon);
        const mode = pluginTail.slice(colon + 1);
        return clanId.length === 0 || mode.length === 0 ? null : { kind: SCOPE_PLUGIN, clanId, mode };
    }
    return null;
}

export function canUserSeeScopeKey(siteAccountId: string, scopeKey: string): boolean {
    const scope = scopeFromScopeKey(scopeKey);
    if (scope === null) return false;
    if (SIMPLE_SCOPE_KEYS.has(scope.kind)) return true;
    const hashes = listAccountHashesForSiteAccount(siteAccountId);
    if (scope.kind === SCOPE_CLAN) {
        if (!existsSync(resolve(clanDirPath(scope.clanId), "clan.db"))) return false;
        return userTouchesClanDb(scope.clanId, siteAccountId, hashes);
    }
    if (scope.kind === SCOPE_CLAN_AUDIT) {
        if (!existsSync(resolve(clanDirPath(scope.clanId), "clan_audit.db"))) return false;
        return userTouchesAuditDb(scope.clanId, siteAccountId);
    }
    if (scope.kind === SCOPE_PLUGIN) {
        if (!listClanPluginModes(scope.clanId).includes(scope.mode)) return false;
        return userHasPluginRows(scope.clanId, scope.mode, hashes);
    }
    return false;
}

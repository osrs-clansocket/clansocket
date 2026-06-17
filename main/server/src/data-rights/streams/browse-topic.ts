import { browseManagerRows, browseUserRows } from "../access/browse.js";
import { isClanManager } from "../../database/clans/access/clan-manager-helpers.js";
import { scopeKeyForClan, scopeKeyForClanAudit, scopeKeyForPlugin } from "./writes-stream.js";
import { SCOPE_CLAN, SCOPE_CLAN_AUDIT, SCOPE_PLUGIN, type Scope } from "../scopes/user-scope/index.js";
import type { ProjectionTopic } from "./projection.js";

export interface BrowseTopicParams {
    scope: Scope;
    table: string;
    from?: number;
    to?: number;
    rsn?: string;
    limit?: number;
    offset?: number;
    managerView?: boolean;
}

function scopeKeyOf(scope: Scope): string {
    if (scope.kind === SCOPE_CLAN && scope.clanId) return scopeKeyForClan(scope.clanId);
    if (scope.kind === SCOPE_CLAN_AUDIT && scope.clanId) return scopeKeyForClanAudit(scope.clanId);
    if (scope.kind === SCOPE_PLUGIN && scope.clanId && scope.mode) return scopeKeyForPlugin(scope.clanId, scope.mode);
    return scope.kind;
}

function pkKeyOf(row: Record<string, unknown>, pkCols: string[]): string {
    if (pkCols.length === 0) return JSON.stringify(row);
    return pkCols.map((c) => String(row[c] ?? "")).join("|");
}

function clanIdOf(scope: Scope): string | null {
    if (scope.kind === SCOPE_CLAN || scope.kind === SCOPE_CLAN_AUDIT || scope.kind === SCOPE_PLUGIN) {
        return scope.clanId;
    }
    return null;
}

// the data-rights browse as a projection topic: triggered by writes to its (scope,
// table), rows from browseUserRows, keyed by the table's primary-key columns. query()
// runs before keyOf in the engine, so the pkCols it captures are always current.
export function browseTopic(siteAccountId: string, params: BrowseTopicParams): ProjectionTopic {
    let pkCols: string[] = [];
    const clanId = clanIdOf(params.scope);
    const useManagerMode = params.managerView === true && clanId !== null && isClanManager(siteAccountId, clanId);
    return {
        triggers: [{ scopeKey: scopeKeyOf(params.scope), table: params.table }],
        query: () => {
            const args = {
                scope: params.scope,
                table: params.table,
                from: params.from,
                to: params.to,
                rsn: params.rsn,
                limit: params.limit,
                offset: params.offset,
            };
            const res = useManagerMode ? browseManagerRows(params.scope, args) : browseUserRows(siteAccountId, args);
            pkCols = res?.pkCols ?? [];
            return res?.rows ?? [];
        },
        keyOf: (row) => pkKeyOf(row, pkCols),
    };
}

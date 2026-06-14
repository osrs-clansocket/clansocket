import { getClanPluginDb, listClanPluginModes } from "../../../core/database.js";
import type { PluginPresence } from "./types.js";
import { normalizeRsn, verifiedHashByNormalizedName } from "./lookups.js";

interface RosterMemberLite {
    name: string;
    accountHash?: string | null;
}

function resolveHashes(members: readonly RosterMemberLite[], result: Map<string, PluginPresence>): Map<string, string> {
    const hashByLowerName = new Map<string, string>();
    let verified: Map<string, string> | undefined;
    for (const m of members) {
        const lower = m.name.toLowerCase();
        const entry: PluginPresence = { hasPlugin: false, isLive: false };
        result.set(lower, entry);
        let hash = m.accountHash ?? undefined;
        if (hash === undefined) {
            verified ??= verifiedHashByNormalizedName();
            hash = verified.get(normalizeRsn(m.name));
        }
        if (hash !== undefined) {
            entry.hasPlugin = true;
            hashByLowerName.set(lower, hash);
        }
    }
    return hashByLowerName;
}

function markLive(clanId: string, result: Map<string, PluginPresence>, hashByLowerName: Map<string, string>): void {
    if (hashByLowerName.size === 0) return;
    const allHashes = [...new Set(hashByLowerName.values())];
    const placeholders = allHashes.map(() => "?").join(",");
    for (const mode of listClanPluginModes(clanId)) {
        const liveRows = getClanPluginDb(clanId, mode)
            .prepare(
                `SELECT DISTINCT account_hash FROM plugin_sessions
                 WHERE disconnected_at IS NULL AND account_hash IN (${placeholders})`,
            )
            .all(...allHashes) as { account_hash: string }[];
        if (liveRows.length === 0) continue;
        const liveSet = new Set(liveRows.map((r) => r.account_hash));
        for (const [lower, hash] of hashByLowerName) {
            if (!liveSet.has(hash)) continue;
            const entry = result.get(lower);
            if (entry) entry.isLive = true;
        }
    }
}

export function getRosterPluginPresence(
    clanId: string,
    members: readonly RosterMemberLite[],
): Map<string, PluginPresence> {
    const result = new Map<string, PluginPresence>();
    if (members.length === 0) return result;
    markLive(clanId, result, resolveHashes(members, result));
    return result;
}

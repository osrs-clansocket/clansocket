import logger from "@clansocket/logger";
import { enqueueWomRequest } from "../../database/wom/outbound/enqueue.js";
import { getPlayerFreshness } from "../../database/wom/freshness/get-freshness.js";
import { resolveAccountHashByRsn } from "../../database/wom/saturate/resolve-account-hash.js";

const REQUEST_KIND_PLAYER_SNAPSHOT = "player-snapshot";

interface GroupDetailsPlayer {
    id?: number;
    username?: string;
    displayName?: string;
    updatedAt?: string;
    lastChangedAt?: string | null;
}

interface GroupDetailsMembership {
    player?: GroupDetailsPlayer;
}

interface GroupDetailsLike {
    memberships?: GroupDetailsMembership[];
}

function parseIsoToMs(iso: string | null | undefined): number {
    if (typeof iso !== "string" || iso.length === 0) return 0;
    const ms = new Date(iso).getTime();
    return Number.isNaN(ms) ? 0 : ms;
}

export interface SnapshotPlanResult {
    membersConsidered: number;
    snapshotsEnqueued: number;
    snapshotsSkippedFresh: number;
}

export function planSnapshotsFromGroupDetails(
    clanId: string,
    womGroupId: number,
    response: unknown,
): SnapshotPlanResult {
    const details = response as GroupDetailsLike;
    const result: SnapshotPlanResult = { membersConsidered: 0, snapshotsEnqueued: 0, snapshotsSkippedFresh: 0 };
    if (!Array.isArray(details.memberships)) return result;
    const now = Date.now();
    for (const m of details.memberships) {
        const player = m.player;
        if (!player) continue;
        const rsn = player.displayName ?? player.username;
        if (typeof rsn !== "string" || rsn.length === 0) continue;
        result.membersConsidered += 1;
        const womChangedAtMs = parseIsoToMs(player.lastChangedAt);
        const accountHash = resolveAccountHashByRsn(clanId, womGroupId, rsn);
        const freshness = getPlayerFreshness(clanId, accountHash);
        if (freshness !== null && womChangedAtMs > 0 && womChangedAtMs <= freshness.last_wom_updated_at) {
            result.snapshotsSkippedFresh += 1;
            continue;
        }
        try {
            enqueueWomRequest({
                clanId,
                requestKind: REQUEST_KIND_PLAYER_SNAPSHOT,
                requestPath: `/players/${encodeURIComponent(rsn)}`,
                scheduledAtMs: now,
            });
            result.snapshotsEnqueued += 1;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.warn(`[wom-snapshot-planner] enqueue skipped clan=${clanId} rsn=${rsn}: ${message}`);
        }
    }
    logger.info(
        `[wom-snapshot-planner] clan=${clanId} considered=${result.membersConsidered} enqueued=${result.snapshotsEnqueued} skipped_fresh=${result.snapshotsSkippedFresh}`,
    );
    return result;
}

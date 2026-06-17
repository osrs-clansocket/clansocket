import { randomInt } from "node:crypto";
import logger from "@clansocket/logger";
import { enqueueWomRequest, type EnqueueWomRequestInput } from "../../database/wom/outbound/enqueue.js";
import { getClanWomIdentity } from "../../database/wom/identity/get-clan-wom-identity.js";
import { updateBackfillStatus } from "../../database/wom/identity/update-backfill-status.js";
import { scheduleWomWakeForClan } from "../dispatcher/wom-dispatcher.js";

const BACKFILL_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SYNC_JITTER_MAX_MS = 300_000;
const STUCK_IN_PROGRESS_THRESHOLD_MS = 60 * 60 * 1000;

const REQUEST_KIND_GROUP_DETAILS = "group-details";
const REQUEST_KIND_GROUP_NAME_CHANGES = "group-name-changes";

export type BackfillTriggerResult =
    | { status: "enqueued"; enqueued: number; nextEligibleAt: number; firstAttemptAt: number }
    | { status: "skipped-gate"; nextEligibleAt: number }
    | { status: "skipped-no-identity" };

function safeEnqueue(input: EnqueueWomRequestInput, label: string): boolean {
    try {
        enqueueWomRequest(input);
        return true;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(`[wom-backfill] enqueue ${label} skipped for clan ${input.clanId}: ${message}`);
        return false;
    }
}

function isStuckInProgress(
    identity: { last_backfill_status: string | null; last_backfill_at: number | null },
    nowMs: number,
): boolean {
    if (identity.last_backfill_status !== "in_progress") return false;
    if (identity.last_backfill_at === null) return true;
    return nowMs - identity.last_backfill_at > STUCK_IN_PROGRESS_THRESHOLD_MS;
}

export function triggerBackfillForClan(clanId: string): BackfillTriggerResult {
    const identity = getClanWomIdentity(clanId);
    if (!identity) return { status: "skipped-no-identity" };

    const now = Date.now();
    const gated = identity.next_backfill_eligible_at !== null && identity.next_backfill_eligible_at > now;
    if (gated && !isStuckInProgress(identity, now)) {
        return { status: "skipped-gate", nextEligibleAt: identity.next_backfill_eligible_at as number };
    }

    const groupId = identity.wom_group_id;
    const nextEligibleAt = now + BACKFILL_INTERVAL_MS;
    const jitterMs = randomInt(0, SYNC_JITTER_MAX_MS);
    const firstAttemptAt = now + jitterMs;

    let enqueued = 0;
    if (
        safeEnqueue(
            {
                clanId,
                requestKind: REQUEST_KIND_GROUP_DETAILS,
                requestPath: `/groups/${groupId}`,
                scheduledAtMs: firstAttemptAt,
            },
            "group-details",
        )
    )
        enqueued += 1;
    if (
        safeEnqueue(
            {
                clanId,
                requestKind: REQUEST_KIND_GROUP_NAME_CHANGES,
                requestPath: `/groups/${groupId}/name-changes`,
                scheduledAtMs: firstAttemptAt,
            },
            "group-name-changes",
        )
    )
        enqueued += 1;

    updateBackfillStatus(clanId, "in_progress", nextEligibleAt);
    scheduleWomWakeForClan(clanId, firstAttemptAt);
    return { status: "enqueued", enqueued, nextEligibleAt, firstAttemptAt };
}

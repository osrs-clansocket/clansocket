import logger from "@clansocket/logger";
import { upsertPlayerFreshness } from "../../database/wom/freshness/upsert-freshness.js";
import { getClanWomIdentity } from "../../database/wom/identity/get-clan-wom-identity.js";
import {
    saturateFromGroupDetails,
    saturateFromMetricHiscores,
    saturateFromPlayerSnapshot,
} from "../ingestor/wom-saturator.js";
import { planSnapshotsFromGroupDetails } from "../ingestor/wom-snapshot-planner.js";
import { mapGroupNameChanges, type WomGroupNameChangesResponse } from "../mappers/wom-name-changes-mapper.js";
import { consumeWomNameChanges } from "./wom-name-change-consumer.js";

const KIND_GROUP_DETAILS = "group-details";
const KIND_GROUP_HISCORES = "group-hiscores";
const KIND_GROUP_NAME_CHANGES = "group-name-changes";
const KIND_PLAYER_SNAPSHOT = "player-snapshot";
const KIND_VERIFY = "verify-credentials";

function readMetricFromBody(bodyJson: string | null): string {
    if (!bodyJson) return "overall";
    try {
        const body = JSON.parse(bodyJson) as { metric?: string };
        return typeof body.metric === "string" ? body.metric : "overall";
    } catch {
        return "overall";
    }
}

export function routeWomResponse(
    clanId: string,
    requestKind: string,
    bodyJson: string | null,
    response: unknown,
): void {
    const identity = getClanWomIdentity(clanId);
    if (!identity) {
        logger.warn(`[wom-route] no identity for clan=${clanId}; skipping response routing for ${requestKind}`);
        return;
    }
    switch (requestKind) {
        case KIND_GROUP_DETAILS:
            saturateFromGroupDetails(clanId, identity.wom_group_id, response);
            planSnapshotsFromGroupDetails(clanId, identity.wom_group_id, response);
            return;
        case KIND_GROUP_HISCORES: {
            const metric = readMetricFromBody(bodyJson);
            saturateFromMetricHiscores(clanId, identity.wom_group_id, metric, response);
            return;
        }
        case KIND_GROUP_NAME_CHANGES: {
            if (!Array.isArray(response)) return;
            const mapped = mapGroupNameChanges(response as WomGroupNameChangesResponse);
            consumeWomNameChanges(clanId, mapped);
            return;
        }
        case KIND_PLAYER_SNAPSHOT: {
            const result = saturateFromPlayerSnapshot(clanId, identity.wom_group_id, response);
            if (result !== null && result.updatedAtMs > 0) {
                upsertPlayerFreshness(clanId, result.accountHash, result.womPlayerId, result.updatedAtMs);
            }
            return;
        }
        case KIND_VERIFY:
            return;
        default:
            logger.warn(`[wom-route] unhandled request_kind=${requestKind}`);
    }
}

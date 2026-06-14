import { apiRequest } from "../fetchers/api-fetcher.js";
import { postTransitionAndGetOk } from "../shared/transition-cas.js";

const STATE_IN_FLIGHT = "in_flight";
const STATE_APPLIED = "applied";
const STATE_FAILED = "failed";

function transitionPath(clanId: string, guildId: string, queueId: string): string {
    return `/api/discord/publish-queue/${clanId}/${guildId}/${queueId}/state`;
}

export async function transitionInFlight(clanId: string, guildId: string, queueId: string): Promise<boolean> {
    return postTransitionAndGetOk(transitionPath(clanId, guildId, queueId), { state: STATE_IN_FLIGHT });
}

export async function transitionApplied(
    clanId: string,
    guildId: string,
    queueId: string,
    snowflakeResolved: string | null,
): Promise<void> {
    await apiRequest("POST", transitionPath(clanId, guildId, queueId), {
        state: STATE_APPLIED,
        snowflakeResolved,
    });
}

export async function transitionFailed(
    clanId: string,
    guildId: string,
    queueId: string,
    errorJson: string | null,
): Promise<void> {
    await apiRequest("POST", transitionPath(clanId, guildId, queueId), {
        state: STATE_FAILED,
        errorJson,
    });
}

import { apiRequest } from "../fetchers/api-fetcher.js";
import { postTransitionAndGetOk } from "../shared/transition-cas.js";

const STATE_IN_FLIGHT = "in_flight";
const STATE_APPLIED = "applied";
const STATE_FAILED = "failed";

export async function transitionInFlight(queueId: string): Promise<boolean> {
    return postTransitionAndGetOk(`/api/discord/outbound/${queueId}/state`, { state: STATE_IN_FLIGHT });
}

export async function transitionApplied(queueId: string, responseMessageId: string | null): Promise<void> {
    await apiRequest("POST", `/api/discord/outbound/${queueId}/state`, { state: STATE_APPLIED, responseMessageId });
}

export async function transitionFailed(
    queueId: string,
    errorCode: number,
    attemptNo: number,
    errorBodyHash: string | null,
): Promise<void> {
    await apiRequest("POST", `/api/discord/outbound/${queueId}/state`, {
        state: STATE_FAILED,
        errorCode,
        attemptNo,
        errorBodyHash,
    });
}

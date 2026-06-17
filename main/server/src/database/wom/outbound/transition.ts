import { runClanWomWrite } from "../db-runners.js";

const STATUS_PENDING = "pending";
const STATUS_IN_FLIGHT = "in_flight";
const STATUS_APPLIED = "applied";
const STATUS_FAILED = "failed";
const RESULT_OK = 200;

const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MULTIPLIER = 2;
const BACKOFF_MAX_MS = 60000;

function computeBackoffMs(attemptNo: number): number {
    let ms = BACKOFF_BASE_MS;
    for (let i = 1; i < attemptNo; i++) ms *= BACKOFF_MULTIPLIER;
    if (ms > BACKOFF_MAX_MS) return BACKOFF_MAX_MS;
    return ms;
}

export function markWomInFlight(clanId: string, queueId: string): boolean {
    const result = runClanWomWrite(
        clanId,
        `UPDATE clan_wom_outbound_events
         SET status = ?, attempts = attempts + 1
         WHERE queue_id = ? AND status = ?`,
        STATUS_IN_FLIGHT,
        queueId,
        STATUS_PENDING,
    );
    return result.changes > 0;
}

export function markWomApplied(clanId: string, queueId: string, responseBodyHash: string | null): void {
    runClanWomWrite(
        clanId,
        `UPDATE clan_wom_outbound_events
         SET status = ?, fired_at = ?, response_body_hash = ?, result_code = ?, next_attempt_at = NULL
         WHERE queue_id = ?`,
        STATUS_APPLIED,
        Date.now(),
        responseBodyHash,
        RESULT_OK,
        queueId,
    );
}

export function markWomDeadLetter(clanId: string, queueId: string, errorCode: number): void {
    runClanWomWrite(
        clanId,
        `UPDATE clan_wom_outbound_events
         SET status = ?, fired_at = ?, result_code = ?, next_attempt_at = NULL
         WHERE queue_id = ?`,
        STATUS_FAILED,
        Date.now(),
        errorCode,
        queueId,
    );
}

function scheduleWomRetry(clanId: string, queueId: string, errorCode: number, attemptNo: number): void {
    const nextAttemptAt = Date.now() + computeBackoffMs(attemptNo);
    runClanWomWrite(
        clanId,
        `UPDATE clan_wom_outbound_events
         SET status = ?, result_code = ?, next_attempt_at = ?
         WHERE queue_id = ?`,
        STATUS_PENDING,
        errorCode,
        nextAttemptAt,
        queueId,
    );
}

export function markWomFailed(clanId: string, queueId: string, errorCode: number, attemptNo: number): void {
    if (attemptNo >= MAX_ATTEMPTS) {
        markWomDeadLetter(clanId, queueId, errorCode);
        return;
    }
    scheduleWomRetry(clanId, queueId, errorCode, attemptNo);
}

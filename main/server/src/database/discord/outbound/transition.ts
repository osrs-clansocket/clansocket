import { runDiscordBotWrite } from "../db-runners.js";

const STATUS_PENDING = "pending";
const STATUS_IN_FLIGHT = "in_flight";
const STATUS_APPLIED = "applied";
const STATUS_FAILED = "failed";
const RESULT_OK = 200;

const MAX_ATTEMPTS = 10;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MULTIPLIER = 4;
const BACKOFF_MAX_MS = 600000;

function computeBackoffMs(attemptNo: number): number {
    let ms = BACKOFF_BASE_MS;
    for (let i = 1; i < attemptNo; i++) ms *= BACKOFF_MULTIPLIER;
    if (ms > BACKOFF_MAX_MS) return BACKOFF_MAX_MS;
    return ms;
}

export function markInFlight(queueId: string): boolean {
    const result = runDiscordBotWrite(
        `UPDATE discord_outbound_events
         SET status = ?, attempts = attempts + 1
         WHERE queue_id = ? AND status = ?`,
        STATUS_IN_FLIGHT,
        queueId,
        STATUS_PENDING,
    );
    return result.changes > 0;
}

export function markApplied(queueId: string, responseMessageId: string | null): void {
    runDiscordBotWrite(
        `UPDATE discord_outbound_events
         SET status = ?, fired_at = ?, response_message_id = ?, result_code = ?, next_attempt_at = NULL
         WHERE queue_id = ?`,
        STATUS_APPLIED,
        Date.now(),
        responseMessageId,
        RESULT_OK,
        queueId,
    );
}

function markDeadLetter(queueId: string, errorCode: number): void {
    runDiscordBotWrite(
        `UPDATE discord_outbound_events
         SET status = ?, fired_at = ?, result_code = ?, next_attempt_at = NULL
         WHERE queue_id = ?`,
        STATUS_FAILED,
        Date.now(),
        errorCode,
        queueId,
    );
}

function scheduleRetry(queueId: string, errorCode: number, attemptNo: number): void {
    const nextAttemptAt = Date.now() + computeBackoffMs(attemptNo);
    runDiscordBotWrite(
        `UPDATE discord_outbound_events
         SET status = ?, result_code = ?, next_attempt_at = ?
         WHERE queue_id = ?`,
        STATUS_PENDING,
        errorCode,
        nextAttemptAt,
        queueId,
    );
}

export function markFailed(queueId: string, errorCode: number, attemptNo: number): void {
    if (attemptNo >= MAX_ATTEMPTS) {
        markDeadLetter(queueId, errorCode);
        return;
    }
    scheduleRetry(queueId, errorCode, attemptNo);
}

import { runDiscordBotWrite } from "../db-runners.js";

const STATUS_PENDING = "pending";
const STATUS_IN_FLIGHT = "in_flight";
const STATUS_APPLIED = "applied";
const STATUS_FAILED = "failed";
const RESULT_OK = 200;

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
         SET status = ?, fired_at = ?, response_message_id = ?, result_code = ?
         WHERE queue_id = ?`,
        STATUS_APPLIED,
        Date.now(),
        responseMessageId,
        RESULT_OK,
        queueId,
    );
}

export function markFailed(queueId: string, errorCode: number): void {
    runDiscordBotWrite(
        `UPDATE discord_outbound_events
         SET status = ?, fired_at = ?, result_code = ?
         WHERE queue_id = ?`,
        STATUS_FAILED,
        Date.now(),
        errorCode,
        queueId,
    );
}

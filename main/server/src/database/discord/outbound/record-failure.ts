import { runDiscordBotWrite } from "../db-runners.js";

export interface OutboundFailureInput {
    queueId: string;
    attemptNo: number;
    errorCode: number;
    errorBodyHash?: string | null;
}

export function recordOutboundFailure(input: OutboundFailureInput): void {
    runDiscordBotWrite(
        `INSERT INTO discord_outbound_failures (queue_id, attempt_no, failed_at, error_code, error_body_hash)
         VALUES (?, ?, ?, ?, ?)`,
        input.queueId,
        input.attemptNo,
        Date.now(),
        input.errorCode,
        input.errorBodyHash ?? null,
    );
}

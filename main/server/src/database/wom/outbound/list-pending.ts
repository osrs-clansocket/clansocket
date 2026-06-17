import { listClanWomRows } from "../db-runners.js";

const STATUS_PENDING = "pending";

export interface PendingWomRow {
    queue_id: string;
    request_kind: string;
    request_path: string;
    request_method: string;
    query_json: string | null;
    body_json: string | null;
    attempts: number;
    scheduled_at: number;
    next_attempt_at: number | null;
}

export function listPendingWomForClan(clanId: string, nowMs: number = Date.now()): PendingWomRow[] {
    return listClanWomRows<PendingWomRow>(
        clanId,
        `SELECT queue_id, request_kind, request_path, request_method,
                query_json, body_json, attempts, scheduled_at, next_attempt_at
         FROM clan_wom_outbound_events
         WHERE status = ?
           AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
           AND scheduled_at <= ?
         ORDER BY COALESCE(next_attempt_at, scheduled_at) ASC, scheduled_at ASC`,
        STATUS_PENDING,
        nowMs,
        nowMs,
    );
}

export interface NextDueRow {
    next_due: number | null;
}

export function getNextDueAtForClan(clanId: string): number | null {
    const row = listClanWomRows<NextDueRow>(
        clanId,
        `SELECT MIN(COALESCE(next_attempt_at, scheduled_at)) AS next_due
         FROM clan_wom_outbound_events
         WHERE status = ?`,
        STATUS_PENDING,
    )[0];
    return row?.next_due ?? null;
}

import { getClanWomRow } from "../db-runners.js";

const STATUS_PENDING = "pending";
const STATUS_IN_FLIGHT = "in_flight";
const STATUS_FAILED = "failed";

export interface WomQueueStats {
    pending: number;
    inFlight: number;
    failed: number;
    nextDueAt: number | null;
}

interface CountRow {
    n: number;
}

interface NextRow {
    next_due: number | null;
}

function countWhere(clanId: string, sql: string, ...params: unknown[]): number {
    const row = getClanWomRow<CountRow>(clanId, sql, ...params);
    return row?.n ?? 0;
}

export function getWomQueueStats(clanId: string): WomQueueStats {
    const pending = countWhere(
        clanId,
        `SELECT COUNT(*) AS n FROM clan_wom_outbound_events WHERE status = ?`,
        STATUS_PENDING,
    );
    const inFlight = countWhere(
        clanId,
        `SELECT COUNT(*) AS n FROM clan_wom_outbound_events WHERE status = ?`,
        STATUS_IN_FLIGHT,
    );
    const failed = countWhere(
        clanId,
        `SELECT COUNT(*) AS n FROM clan_wom_outbound_events WHERE status = ?`,
        STATUS_FAILED,
    );
    const nextRow = getClanWomRow<NextRow>(
        clanId,
        `SELECT MIN(COALESCE(next_attempt_at, scheduled_at)) AS next_due
         FROM clan_wom_outbound_events
         WHERE status = ?`,
        STATUS_PENDING,
    );
    return {
        pending,
        inFlight,
        failed,
        nextDueAt: nextRow?.next_due ?? null,
    };
}

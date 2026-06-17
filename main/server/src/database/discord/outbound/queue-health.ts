import logger from "@clansocket/logger";
import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

const STATUS_PENDING = "pending";
const STATUS_IN_FLIGHT = "in_flight";
const STATUS_FAILED = "failed";

const READY_BACKLOG_WARN_THRESHOLD = 10;
const OLDEST_PENDING_WARN_MS = 60_000;
const STALE_IN_FLIGHT_MS = 300_000;

export interface OutboundQueueStats {
    readyToAttempt: number;
    waitingForRetry: number;
    inFlight: number;
    deadLetter: number;
    oldestReadyAgeMs: number | null;
}

function countWhere(sql: string, ...params: unknown[]): number {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const row = db.prepare(sql).get(...params) as { n: number } | undefined;
    return row?.n ?? 0;
}

function oldestReadyAgeMs(now: number): number | null {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const row = db
        .prepare(
            `SELECT MIN(scheduled_at) AS earliest FROM discord_outbound_events
         WHERE status = ? AND (next_attempt_at IS NULL OR next_attempt_at <= ?)`,
        )
        .get(STATUS_PENDING, now) as { earliest: number | null } | undefined;
    if (!row?.earliest) return null;
    return now - row.earliest;
}

export function getOutboundQueueStats(): OutboundQueueStats {
    const now = Date.now();
    return {
        readyToAttempt: countWhere(
            `SELECT COUNT(*) AS n FROM discord_outbound_events WHERE status = ? AND (next_attempt_at IS NULL OR next_attempt_at <= ?)`,
            STATUS_PENDING,
            now,
        ),
        waitingForRetry: countWhere(
            `SELECT COUNT(*) AS n FROM discord_outbound_events WHERE status = ? AND next_attempt_at > ?`,
            STATUS_PENDING,
            now,
        ),
        inFlight: countWhere(`SELECT COUNT(*) AS n FROM discord_outbound_events WHERE status = ?`, STATUS_IN_FLIGHT),
        deadLetter: countWhere(`SELECT COUNT(*) AS n FROM discord_outbound_events WHERE status = ?`, STATUS_FAILED),
        oldestReadyAgeMs: oldestReadyAgeMs(now),
    };
}

export function resetStaleInFlight(): number {
    const cutoff = Date.now() - STALE_IN_FLIGHT_MS;
    const result = getDb(DB_NAMES.DISCORD_BOT)
        .prepare(`UPDATE discord_outbound_events SET status = ? WHERE status = ? AND updated_at < ?`)
        .run(STATUS_PENDING, STATUS_IN_FLIGHT, cutoff);
    return result.changes;
}

export function maybeWarnOnQueueDepth(): void {
    const stats = getOutboundQueueStats();
    const oldestMs = stats.oldestReadyAgeMs ?? 0;
    if (stats.readyToAttempt < READY_BACKLOG_WARN_THRESHOLD && oldestMs < OLDEST_PENDING_WARN_MS) return;
    logger.warn(
        `[discord] outbound queue backlog: ready=${stats.readyToAttempt} waiting=${stats.waitingForRetry} inFlight=${stats.inFlight} deadLetter=${stats.deadLetter} oldestReadyAgeMs=${oldestMs}`,
    );
}

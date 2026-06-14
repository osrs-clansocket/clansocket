import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

const SELECT_BUCKET_SQL = `SELECT remaining, reset_at, retry_after_ms
    FROM discord_rate_limit_buckets
    WHERE bot_id = ? AND route = ? AND scope_key = ?`;

interface BucketRow {
    remaining: number;
    reset_at: number;
    retry_after_ms: number | null;
}

export interface RateLimitValidationInput {
    botId: string;
    route: string;
    scopeKey?: string;
}

export interface RateLimitValidationResult {
    ok: boolean;
    retryAfterMs?: number;
}

export function validateRateLimitBudget(input: RateLimitValidationInput): RateLimitValidationResult {
    const db = getDb(DB_NAMES.DISCORD_RATE_LIMITS);
    const scopeKey = input.scopeKey ?? "";
    const row = db.prepare(SELECT_BUCKET_SQL).get(input.botId, input.route, scopeKey) as BucketRow | undefined;
    if (!row) return { ok: true };
    const now = Date.now();
    if (row.reset_at <= now) return { ok: true };
    if (row.remaining > 0) return { ok: true };
    return { ok: false, retryAfterMs: row.retry_after_ms ?? row.reset_at - now };
}

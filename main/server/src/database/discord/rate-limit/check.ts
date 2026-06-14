import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

const RATE_LIMIT_USER_COMMAND_ROUTE = "_user_command";
const DEFAULT_BOT_ID = "clansocket-default";

export interface RateLimitState {
    count: number;
    reset_time: number;
}

interface BucketRow {
    limit_n: number;
    reset_at: number;
}

export function checkForUserCommand(identifier: string): RateLimitState | null {
    const db = getDb(DB_NAMES.DISCORD_RATE_LIMITS);
    const row = db
        .prepare(
            `SELECT limit_n, reset_at FROM discord_rate_limit_buckets WHERE bot_id = ? AND route = ? AND scope_key = ?`,
        )
        .get(DEFAULT_BOT_ID, RATE_LIMIT_USER_COMMAND_ROUTE, identifier) as BucketRow | undefined;
    if (!row) return null;
    return { count: row.limit_n, reset_time: row.reset_at };
}

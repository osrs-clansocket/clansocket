import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

const RATE_LIMIT_USER_COMMAND_ROUTE = "_user_command";
const DEFAULT_BOT_ID = "clansocket-default";

export function setForUserCommand(identifier: string, count: number, resetTime: number): void {
    const db = getDb(DB_NAMES.DISCORD_RATE_LIMITS);
    const now = Date.now();
    db.prepare(
        `INSERT OR REPLACE INTO discord_rate_limit_buckets (bot_id, route, scope_key, limit_n, remaining, reset_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(DEFAULT_BOT_ID, RATE_LIMIT_USER_COMMAND_ROUTE, identifier, count, count, resetTime, now);
}

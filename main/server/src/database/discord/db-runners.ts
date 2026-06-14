import type Database from "better-sqlite3";
import { DB_NAMES } from "../core/database-state.js";
import { getDb } from "../core/database.js";

export function runDiscordBotWrite(sql: string, ...args: unknown[]): Database.RunResult {
    return getDb(DB_NAMES.DISCORD_BOT)
        .prepare(sql)
        .run(...args);
}

export function listDiscordBotRows<T>(sql: string, ...args: unknown[]): T[] {
    return getDb(DB_NAMES.DISCORD_BOT)
        .prepare(sql)
        .all(...args) as T[];
}

import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

export interface BotServerRow {
    guild_id: string;
    guild_name: string;
    clan_id: string;
    clan_name: string;
}

export function listByBot(botId: string): BotServerRow[] {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    return db
        .prepare(
            `SELECT guild_id, guild_name, clan_id, clan_name FROM discord_servers WHERE bot_id = ? AND removed_at IS NULL`,
        )
        .all(botId) as BotServerRow[];
}

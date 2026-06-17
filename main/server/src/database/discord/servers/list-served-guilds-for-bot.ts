import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

export interface ServedGuild {
    guild_id: string;
    guild_name: string;
}

const SQL = `SELECT guild_id, guild_name FROM discord_servers
    WHERE bot_id = ? AND removed_at IS NULL
    ORDER BY guild_name`;

export function loadServedGuildsFor(botId: string): ServedGuild[] {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    return db.prepare(SQL).all(botId) as ServedGuild[];
}

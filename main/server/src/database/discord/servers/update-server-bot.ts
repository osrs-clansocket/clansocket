import { getDb } from "../../core/database.js";
import { DB_NAMES } from "../../core/database-state.js";

export function updateServerBot(clanId: string, guildId: string, botId: string, botName: string | null): boolean {
    const botDb = getDb(DB_NAMES.DISCORD_BOT);
    const info = botDb
        .prepare(
            `UPDATE discord_servers SET bot_id = ?, bot_name = ?, updated_at = ? WHERE clan_id = ? AND guild_id = ?`,
        )
        .run(botId, botName, Date.now(), clanId, guildId);
    return info.changes > 0;
}

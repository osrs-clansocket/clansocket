import { getDb } from "../../core/database.js";
import { DB_NAMES } from "../../core/database-state.js";

interface GuildRoutingRow {
    guild_id: string;
}

export function listGuildsRoutedToBot(clanId: string, botId: string): string[] {
    const botDb = getDb(DB_NAMES.DISCORD_BOT);
    const rows = botDb
        .prepare(`SELECT guild_id FROM discord_servers WHERE clan_id = ? AND bot_id = ?`)
        .all(clanId, botId) as GuildRoutingRow[];
    return rows.map((r) => r.guild_id);
}

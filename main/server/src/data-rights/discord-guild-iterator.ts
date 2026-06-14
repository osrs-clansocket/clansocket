import { getDb } from "../database/index.js";
import { DB_NAMES } from "../database/core/database-state.js";

export function listDiscordGuildIdsForClan(clanId: string): string[] {
    const bot = getDb(DB_NAMES.DISCORD_BOT);
    const rows = bot
        .prepare(`SELECT guild_id FROM discord_servers WHERE clan_id = ? AND removed_at IS NULL`)
        .all(clanId) as Array<{ guild_id: string }>;
    return rows.map((r) => r.guild_id);
}

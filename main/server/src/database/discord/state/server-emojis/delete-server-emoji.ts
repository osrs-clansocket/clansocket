import { getDiscordGuildDb } from "../../database-discord.js";

const DELETE_SQL = `DELETE FROM discord_server_emojis WHERE emoji_id = ? AND guild_id = ?`;

export function deleteServerEmoji(clanId: string, guildId: string, emojiId: string): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(DELETE_SQL).run(emojiId, guildId);
}

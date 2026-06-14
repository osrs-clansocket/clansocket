import { getDiscordGuildDb } from "../../database-discord.js";

const DELETE_SQL = `DELETE FROM discord_server_stickers WHERE sticker_id = ? AND guild_id = ?`;

export function deleteServerSticker(clanId: string, guildId: string, stickerId: string): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(DELETE_SQL).run(stickerId, guildId);
}

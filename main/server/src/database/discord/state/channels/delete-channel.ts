import { getDiscordGuildDb } from "../../database-discord.js";

const DELETE_SQL = `DELETE FROM discord_channels WHERE channel_id = ?`;

export function deleteChannel(clanId: string, guildId: string, channelId: string): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(DELETE_SQL).run(channelId);
}

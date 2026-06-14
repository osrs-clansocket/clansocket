import { getDiscordGuildDb } from "../../database-discord.js";

const DELETE_SQL = `DELETE FROM discord_channel_member_overwrites WHERE channel_id = ? AND user_id = ?`;

export function deleteMemberOverwrite(clanId: string, guildId: string, channelId: string, userId: string): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(DELETE_SQL).run(channelId, userId);
}

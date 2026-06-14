import { getDiscordGuildDb } from "../../database-discord.js";

const DELETE_SQL = `DELETE FROM discord_members WHERE user_id = ? AND guild_id = ?`;

export function deleteMember(clanId: string, guildId: string, userId: string): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(DELETE_SQL).run(userId, guildId);
}

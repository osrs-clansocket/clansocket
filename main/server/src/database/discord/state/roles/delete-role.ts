import { getDiscordGuildDb } from "../../database-discord.js";

const DELETE_SQL = `DELETE FROM discord_roles WHERE role_id = ?`;

export function deleteRole(clanId: string, guildId: string, roleId: string): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(DELETE_SQL).run(roleId);
}

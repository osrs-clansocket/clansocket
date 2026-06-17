import { getDiscordGuildDb } from "../database-discord.js";

const DELETE_SQL = `DELETE FROM discord_auto_hooks WHERE auto_hook_id = ?`;

export function deleteAutoHook(clanId: string, guildId: string, autoHookId: string): boolean {
    const db = getDiscordGuildDb(clanId, guildId);
    const info = db.prepare(DELETE_SQL).run(autoHookId);
    return info.changes > 0;
}

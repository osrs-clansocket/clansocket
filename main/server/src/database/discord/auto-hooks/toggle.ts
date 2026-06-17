import { getDiscordGuildDb } from "../database-discord.js";

const TOGGLE_SQL = `UPDATE discord_auto_hooks SET enabled = ? WHERE auto_hook_id = ?`;

export function toggleAutoHook(clanId: string, guildId: string, autoHookId: string, enabled: boolean): boolean {
    const db = getDiscordGuildDb(clanId, guildId);
    const info = db.prepare(TOGGLE_SQL).run(enabled ? 1 : 0, autoHookId);
    return info.changes > 0;
}

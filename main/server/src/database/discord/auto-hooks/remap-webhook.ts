import { getDiscordGuildDb } from "../database-discord.js";

const REMAP_SQL = `UPDATE discord_auto_hooks SET webhook_id = ? WHERE webhook_id = ?`;

export function remapAutoHooksWebhook(
    clanId: string,
    guildId: string,
    oldWebhookId: string,
    newWebhookId: string,
): number {
    const db = getDiscordGuildDb(clanId, guildId);
    const info = db.prepare(REMAP_SQL).run(newWebhookId, oldWebhookId);
    return info.changes;
}

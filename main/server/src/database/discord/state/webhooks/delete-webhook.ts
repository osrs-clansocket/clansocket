import { getDiscordGuildDb } from "../../database-discord.js";

const DELETE_SQL = `DELETE FROM discord_webhooks WHERE webhook_id = ? AND guild_id = ?`;

export function deleteWebhook(clanId: string, guildId: string, webhookId: string): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(DELETE_SQL).run(webhookId, guildId);
}

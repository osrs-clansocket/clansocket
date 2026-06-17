import { getDiscordGuildDb } from "../database-discord.js";

const SELECT_SQL = `SELECT application_id, channel_id, name, avatar_url
    FROM discord_webhooks
    WHERE webhook_id = ?`;

export interface WebhookOwnerInfo {
    applicationId: string | null;
    channelId: string;
    name: string | null;
    avatarUrl: string | null;
}

export function getWebhookOwnerInfo(clanId: string, guildId: string, webhookId: string): WebhookOwnerInfo | null {
    const db = getDiscordGuildDb(clanId, guildId);
    const row = db.prepare(SELECT_SQL).get(webhookId) as
        | { application_id: string | null; channel_id: string; name: string | null; avatar_url: string | null }
        | undefined;
    if (row === undefined) return null;
    return {
        applicationId: row.application_id,
        channelId: row.channel_id,
        name: row.name,
        avatarUrl: row.avatar_url,
    };
}

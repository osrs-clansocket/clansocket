import { getDiscordGuildDb } from "../database-discord.js";

const SELECT_SQL = `SELECT webhook_id, guild_id, channel_id, channel_name,
    acquired_by_bot_id, bound_by_site_account_id, bound_by_site_account_name,
    bound_at, last_used_at, revoked_at, updated_at
FROM discord_webhook_tokens
WHERE guild_id = ? AND revoked_at IS NULL`;

export interface WebhookTokenRow {
    webhook_id: string;
    guild_id: string;
    channel_id: string;
    channel_name: string | null;
    acquired_by_bot_id: string | null;
    bound_by_site_account_id: string | null;
    bound_by_site_account_name: string | null;
    bound_at: number;
    last_used_at: number | null;
    revoked_at: number | null;
    updated_at: number;
}

export function listWebhookTokens(clanId: string, guildId: string): WebhookTokenRow[] {
    const db = getDiscordGuildDb(clanId, guildId);
    return db.prepare(SELECT_SQL).all(guildId) as WebhookTokenRow[];
}

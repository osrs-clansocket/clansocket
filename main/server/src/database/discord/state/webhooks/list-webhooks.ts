import { getDiscordGuildDb } from "../../database-discord.js";
import type { WebhookRow } from "../types.js";

const LIST_SQL = `
SELECT webhook_id, guild_id, channel_id, name, avatar_url, application_id, user_id, webhook_type
FROM discord_webhooks
WHERE guild_id = ?
ORDER BY channel_id, LOWER(COALESCE(name, '')) ASC
`;

interface WebhookSqlRow {
    webhook_id: string;
    guild_id: string;
    channel_id: string;
    name: string | null;
    avatar_url: string | null;
    application_id: string | null;
    user_id: string | null;
    webhook_type: number;
}

function toWebhookRow(r: WebhookSqlRow): WebhookRow {
    return {
        webhook_id: r.webhook_id,
        guild_id: r.guild_id,
        channel_id: r.channel_id,
        name: r.name,
        avatar_url: r.avatar_url,
        application_id: r.application_id,
        user_id: r.user_id,
        webhook_type: r.webhook_type,
    };
}

export function listWebhooksForGuild(clanId: string, guildId: string): WebhookRow[] {
    const db = getDiscordGuildDb(clanId, guildId);
    const rows = db.prepare(LIST_SQL).all(guildId) as WebhookSqlRow[];
    return rows.map(toWebhookRow);
}

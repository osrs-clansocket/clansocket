import type { Webhook } from "discord.js";
import type { WebhookRow } from "../types.js";

const AVATAR_EXTENSION = "webp";
const AVATAR_SIZE = 1024;

export function extractWebhookRow(webhook: Webhook): WebhookRow {
    return {
        webhook_id: webhook.id,
        guild_id: webhook.guildId ?? "",
        channel_id: webhook.channelId ?? "",
        name: webhook.name,
        avatar_url: webhook.avatarURL({ extension: AVATAR_EXTENSION, size: AVATAR_SIZE }),
        application_id: webhook.applicationId,
        user_id: webhook.owner?.id ?? null,
        webhook_type: webhook.type,
        source_guild_id: webhook.sourceGuild?.id ?? null,
        source_guild_name: webhook.sourceGuild?.name ?? null,
        source_channel_id: webhook.sourceChannel?.id ?? null,
        source_channel_name: webhook.sourceChannel?.name ?? null,
    };
}

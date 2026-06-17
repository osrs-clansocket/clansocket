import type { Webhook } from "discord.js";

export interface WebhookTokenSync {
    webhookId: string;
    channelId: string;
    channelName: string | null;
    plaintextToken: string;
    acquiredByBotId: string;
}

export function extractWebhookTokenIfAvailable(
    webhook: Webhook,
    channelName: string | null,
    acquiredByBotId: string,
): WebhookTokenSync | null {
    if (typeof webhook.token !== "string" || webhook.token.length === 0) return null;
    return {
        webhookId: webhook.id,
        channelId: webhook.channelId ?? "",
        channelName,
        plaintextToken: webhook.token,
        acquiredByBotId,
    };
}

import type { DiscordWebhook, DiscordWebhookState } from "../../client.js";

export function webhookStateOf(w: DiscordWebhook): DiscordWebhookState {
    return {
        name: w.name,
        channelId: w.channel_id,
        avatarUrl: w.avatar_url,
    };
}

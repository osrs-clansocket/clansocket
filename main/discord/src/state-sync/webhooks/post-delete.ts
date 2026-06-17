import { apiRequest } from "../../fetchers/api-fetcher.js";

export function postWebhookDelete(guildId: string, webhookId: string): Promise<{ ok: boolean } | null> {
    const path = `/api/discord/state/webhooks/${encodeURIComponent(guildId)}/${encodeURIComponent(webhookId)}`;
    return apiRequest<{ ok: boolean }>("DELETE", path);
}

import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { WebhookRow } from "../types.js";
import type { WebhookTokenSync } from "./extract-token.js";

export interface WebhookReplacement {
    oldWebhookId: string;
    newWebhookId: string;
}

export function postWebhooksChannelReplace(
    guildId: string,
    channelId: string,
    webhooks: readonly WebhookRow[],
    tokens: readonly WebhookTokenSync[],
    replacement?: WebhookReplacement,
): Promise<{ ok: boolean; count: number } | null> {
    const path = `/api/discord/state/webhooks/${encodeURIComponent(guildId)}/sync`;
    const body: object = replacement ? { channelId, webhooks, tokens, replacement } : { channelId, webhooks, tokens };
    return apiRequest<{ ok: boolean; count: number }>("POST", path, body);
}

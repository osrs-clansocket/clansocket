import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { WebhookRow } from "../types.js";

export function postWebhookUpsert(guildId: string, webhook: WebhookRow): Promise<{ ok: boolean } | null> {
    const path = `/api/discord/state/webhooks/${encodeURIComponent(guildId)}/${encodeURIComponent(webhook.webhook_id)}`;
    return apiRequest<{ ok: boolean }>("POST", path, { webhook });
}

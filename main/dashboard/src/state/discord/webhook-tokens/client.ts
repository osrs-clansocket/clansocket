import { sameOriginFetch } from "../../../shared/helpers/fetch-helper.js";

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

export interface RevokeWebhookTokenPayload {
    userId: string;
    webhookName: string;
}

export async function listWebhookTokens(guildId: string): Promise<WebhookTokenRow[]> {
    const url = `/api/discord/webhook-tokens/${encodeURIComponent(guildId)}`;
    const res = await sameOriginFetch(url, { method: "GET" });
    if (!res.ok) return [];
    const body = (await res.json()) as { tokens: WebhookTokenRow[] };
    return body.tokens;
}

export async function revokeWebhookToken(
    guildId: string,
    webhookId: string,
    payload: RevokeWebhookTokenPayload,
): Promise<boolean> {
    const url = `/api/discord/webhook-tokens/${encodeURIComponent(guildId)}/${encodeURIComponent(webhookId)}`;
    const res = await sameOriginFetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

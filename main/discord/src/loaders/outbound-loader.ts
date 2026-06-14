import { apiGet } from "../fetchers/api-fetcher.js";

export interface PendingOutboundRow {
    queue_id: string;
    bot_id: string;
    guild_id: string;
    clan_id: string;
    target_kind: string;
    target_id: string | null;
    payload_json: string;
    attempts: number;
}

export async function loadPendingOutbound(botId: string): Promise<PendingOutboundRow[]> {
    const body = await apiGet<{ events: PendingOutboundRow[] }>(`/api/discord/outbound/${botId}`);
    return body?.events ?? [];
}

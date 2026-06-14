import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { ChannelRow } from "../types.js";

export function postChannelUpsert(guildId: string, channel: ChannelRow): Promise<{ ok: boolean } | null> {
    const path = `/api/discord/state/channels/${encodeURIComponent(guildId)}/${encodeURIComponent(channel.channel_id)}`;
    return apiRequest<{ ok: boolean }>("POST", path, { channel });
}

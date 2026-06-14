import { apiRequest } from "../../fetchers/api-fetcher.js";

export function postChannelDelete(guildId: string, channelId: string): Promise<{ ok: boolean } | null> {
    const path = `/api/discord/state/channels/${encodeURIComponent(guildId)}/${encodeURIComponent(channelId)}`;
    return apiRequest<{ ok: boolean }>("DELETE", path);
}

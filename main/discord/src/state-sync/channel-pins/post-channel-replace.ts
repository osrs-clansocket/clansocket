import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { ChannelPinRow } from "../types.js";

export function postChannelPinsReplace(
    guildId: string,
    channelId: string,
    pins: readonly ChannelPinRow[],
): Promise<{ ok: boolean; count: number } | null> {
    const path = `/api/discord/state/channel-pins/${encodeURIComponent(guildId)}/sync`;
    return apiRequest<{ ok: boolean; count: number }>("POST", path, { channelId, pins });
}

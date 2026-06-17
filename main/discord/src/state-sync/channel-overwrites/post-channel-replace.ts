import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { ChannelOverwriteRow } from "../types.js";

export function postChannelOverwritesChannelReplace(
    guildId: string,
    channelId: string,
    overwrites: readonly ChannelOverwriteRow[],
): Promise<{ ok: boolean; count: number } | null> {
    const path = `/api/discord/state/channel-overwrites/${encodeURIComponent(guildId)}/${encodeURIComponent(channelId)}/sync`;
    return apiRequest<{ ok: boolean; count: number }>("POST", path, { overwrites });
}

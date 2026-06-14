import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { ChannelRow } from "../types.js";

export function postChannelsBulkReplace(
    guildId: string,
    channels: readonly ChannelRow[],
): Promise<{ ok: boolean; count: number } | null> {
    const path = `/api/discord/state/channels/${encodeURIComponent(guildId)}/sync`;
    return apiRequest<{ ok: boolean; count: number }>("POST", path, { channels });
}

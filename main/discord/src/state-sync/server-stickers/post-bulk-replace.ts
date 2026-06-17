import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { ServerStickerRow } from "../types.js";

export function postServerStickersBulkReplace(
    guildId: string,
    stickers: readonly ServerStickerRow[],
): Promise<{ ok: boolean; count: number } | null> {
    const path = `/api/discord/state/server-stickers/${encodeURIComponent(guildId)}/sync`;
    return apiRequest<{ ok: boolean; count: number }>("POST", path, { stickers });
}

import { apiRequest } from "../../fetchers/api-fetcher.js";

export function postServerStickerDelete(guildId: string, stickerId: string): Promise<{ ok: boolean } | null> {
    const path = `/api/discord/state/server-stickers/${encodeURIComponent(guildId)}/${encodeURIComponent(stickerId)}`;
    return apiRequest<{ ok: boolean }>("DELETE", path);
}

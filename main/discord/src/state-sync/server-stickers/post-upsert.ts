import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { ServerStickerRow } from "../types.js";

export function postServerStickerUpsert(guildId: string, sticker: ServerStickerRow): Promise<{ ok: boolean } | null> {
    const path = `/api/discord/state/server-stickers/${encodeURIComponent(guildId)}/${encodeURIComponent(sticker.sticker_id)}`;
    return apiRequest<{ ok: boolean }>("POST", path, { sticker });
}

import { apiRequest } from "../../fetchers/api-fetcher.js";

export function postServerEmojiDelete(guildId: string, emojiId: string): Promise<{ ok: boolean } | null> {
    const path = `/api/discord/state/server-emojis/${encodeURIComponent(guildId)}/${encodeURIComponent(emojiId)}`;
    return apiRequest<{ ok: boolean }>("DELETE", path);
}

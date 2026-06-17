import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { ServerEmojiRow } from "../types.js";

export function postServerEmojiUpsert(guildId: string, emoji: ServerEmojiRow): Promise<{ ok: boolean } | null> {
    const path = `/api/discord/state/server-emojis/${encodeURIComponent(guildId)}/${encodeURIComponent(emoji.emoji_id)}`;
    return apiRequest<{ ok: boolean }>("POST", path, { emoji });
}

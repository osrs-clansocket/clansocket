import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { ServerEmojiRow } from "../types.js";

export function postServerEmojisBulkReplace(
    guildId: string,
    emojis: readonly ServerEmojiRow[],
): Promise<{ ok: boolean; count: number } | null> {
    const path = `/api/discord/state/server-emojis/${encodeURIComponent(guildId)}/sync`;
    return apiRequest<{ ok: boolean; count: number }>("POST", path, { emojis });
}

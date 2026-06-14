import { apiRequest } from "../../fetchers/api-fetcher.js";

export function postMemberDelete(guildId: string, userId: string): Promise<{ ok: boolean } | null> {
    const path = `/api/discord/state/members/${encodeURIComponent(guildId)}/${encodeURIComponent(userId)}`;
    return apiRequest<{ ok: boolean }>("DELETE", path);
}

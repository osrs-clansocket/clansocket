import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { MemberRow } from "../types.js";

export function postMembersBulkReplace(
    guildId: string,
    members: readonly MemberRow[],
): Promise<{ ok: boolean; count: number } | null> {
    const path = `/api/discord/state/members/${encodeURIComponent(guildId)}/sync`;
    return apiRequest<{ ok: boolean; count: number }>("POST", path, { members });
}

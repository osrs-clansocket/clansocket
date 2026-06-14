import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { MemberRow } from "../types.js";

export function postMemberUpsert(guildId: string, member: MemberRow): Promise<{ ok: boolean } | null> {
    const path = `/api/discord/state/members/${encodeURIComponent(guildId)}/${encodeURIComponent(member.user_id)}`;
    return apiRequest<{ ok: boolean }>("POST", path, { member });
}

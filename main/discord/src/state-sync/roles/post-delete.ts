import { apiRequest } from "../../fetchers/api-fetcher.js";

export function postRoleDelete(guildId: string, roleId: string): Promise<{ ok: boolean } | null> {
    const path = `/api/discord/state/roles/${encodeURIComponent(guildId)}/${encodeURIComponent(roleId)}`;
    return apiRequest<{ ok: boolean }>("DELETE", path);
}

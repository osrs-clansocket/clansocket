import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { RoleRow } from "../types.js";

export function postRolesBulkReplace(
    guildId: string,
    roles: readonly RoleRow[],
): Promise<{ ok: boolean; count: number } | null> {
    const path = `/api/discord/state/roles/${encodeURIComponent(guildId)}/sync`;
    return apiRequest<{ ok: boolean; count: number }>("POST", path, { roles });
}

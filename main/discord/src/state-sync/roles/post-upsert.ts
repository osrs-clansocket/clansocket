import { apiRequest } from "../../fetchers/api-fetcher.js";
import type { RoleRow } from "../types.js";

export function postRoleUpsert(guildId: string, role: RoleRow): Promise<{ ok: boolean } | null> {
    const path = `/api/discord/state/roles/${encodeURIComponent(guildId)}/${encodeURIComponent(role.role_id)}`;
    return apiRequest<{ ok: boolean }>("POST", path, { role });
}

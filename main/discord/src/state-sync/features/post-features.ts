import { apiRequest } from "../../fetchers/api-fetcher.js";

export function postServerFeatures(
    guildId: string,
    features: readonly string[],
): Promise<{ ok: boolean; count: number } | null> {
    const path = `/api/discord/state/servers/${encodeURIComponent(guildId)}/features`;
    return apiRequest<{ ok: boolean; count: number }>("POST", path, { features });
}

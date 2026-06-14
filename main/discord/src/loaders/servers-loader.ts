import { apiGet } from "../fetchers/api-fetcher.js";
import type { RoutedServer } from "../shared/types/server-types.js";

export async function resolveServer(guildId: string): Promise<RoutedServer | null> {
    const body = await apiGet<{ server: RoutedServer }>(`/api/discord/servers/${guildId}`);
    return body?.server ?? null;
}

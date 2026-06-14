import { apiGet } from "../fetchers/api-fetcher.js";

export interface BotServer {
    guild_id: string;
    guild_name: string;
    clan_id: string;
    clan_name: string;
}

export async function loadBotServers(botId: string): Promise<BotServer[]> {
    const body = await apiGet<{ servers: BotServer[] }>(`/api/discord/bots/${botId}/servers`);
    return body?.servers ?? [];
}

import { apiGet } from "../fetchers/api-fetcher.js";
import type { BotIdentity } from "../shared/types/bot-types.js";

export async function loadBots(): Promise<BotIdentity[]> {
    const body = await apiGet<{ bots: BotIdentity[] }>("/api/discord/bots");
    if (!body) throw new Error("loadBots: unexpected null response");
    return body.bots;
}

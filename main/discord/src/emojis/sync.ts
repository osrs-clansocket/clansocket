import logger from "@clansocket/logger";
import { apiRequest } from "../fetchers/api-fetcher.js";
import type { BotIdentity } from "../shared/types/bot-types.js";

interface DiscordEmoji {
    id: string;
    name: string;
    animated: boolean;
}

interface RawEmoji {
    id?: string;
    name?: string;
    animated?: boolean;
}

const DISCORD_API_BASE = "https://discord.com/api/v10";
const HTTP_OK = 200;
const ERROR_BODY_PREVIEW_LEN = 200;

async function fetchApplicationEmojis(applicationId: string, token: string): Promise<DiscordEmoji[]> {
    const url = `${DISCORD_API_BASE}/applications/${applicationId}/emojis`;
    const res = await fetch(url, { headers: { Authorization: `Bot ${token}` } });
    if (res.status !== HTTP_OK) {
        const body = await res.text();
        throw new Error(`Discord API ${res.status}: ${body.slice(0, ERROR_BODY_PREVIEW_LEN)}`);
    }
    const json = (await res.json()) as { items?: RawEmoji[] };
    const items = Array.isArray(json.items) ? json.items : [];
    const valid: DiscordEmoji[] = [];
    for (const e of items) {
        if (e.id && e.name) {
            valid.push({ id: e.id, name: e.name, animated: Boolean(e.animated) });
        }
    }
    return valid;
}

export async function syncEmojis(identity: BotIdentity): Promise<void> {
    try {
        const emojis = await fetchApplicationEmojis(identity.application_id, identity.token);
        await apiRequest("POST", "/api/discord/emojis/sync", { botId: identity.bot_id, emojis });
        logger.info(`[discord] synced ${emojis.length} application emojis for bot ${identity.bot_id}`);
    } catch (err: any) {
        logger.warn(`[discord] emoji sync failed for bot ${identity.bot_id}: ${err.message}`);
    }
}

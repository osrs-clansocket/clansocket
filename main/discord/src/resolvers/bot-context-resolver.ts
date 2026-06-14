import { serverRegistry } from "../registries/server-registry.js";
import type { BotContext, BotIdentity } from "../shared/types/bot-types.js";

export async function resolveBotContext(identity: BotIdentity, guildId: string): Promise<BotContext | null> {
    const routed = await serverRegistry.resolve(guildId);
    if (!routed) return null;
    if (routed.bot_id !== identity.bot_id) return null;
    return { botId: identity.bot_id, clanId: routed.clan_id, guildId };
}

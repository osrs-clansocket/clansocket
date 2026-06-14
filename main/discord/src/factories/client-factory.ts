import { Client } from "discord.js";
import { Agent } from "undici";
import { SECONDS_30_MS } from "../core/constants.js";
import { resolveIntents } from "../resolvers/intents-resolver.js";
import type { BotIdentity } from "../shared/types/bot-types.js";

const REST_CONNECT_TIMEOUT_MS = SECONDS_30_MS;
const REST_REQUEST_TIMEOUT_MS = SECONDS_30_MS;

export function createBotClient(identity: BotIdentity): Client {
    const restAgent = new Agent({ connect: { timeout: REST_CONNECT_TIMEOUT_MS } });
    return new Client({
        intents: resolveIntents(identity.intents_bitfield),
        rest: { agent: restAgent as unknown as Agent, timeout: REST_REQUEST_TIMEOUT_MS },
    });
}

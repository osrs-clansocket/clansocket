import logger from "@clansocket/logger";
import type { Client } from "discord.js";
import { startSseSubscription } from "../shared/sse-subscription.js";
import { drainPending } from "./dispatcher.js";

const OUTBOUND_EVENT_MARKER = "event: outbound";

export function startOutboundSubscription(botId: string, client: Client): () => void {
    return startSseSubscription({
        name: `outbound:${botId}`,
        path: `/api/discord/outbound/stream/${botId}`,
        eventMarker: OUTBOUND_EVENT_MARKER,
        onEvent: () => {
            drainPending(botId, client).catch((err: Error) => {
                logger.warn(`Drain failed for ${botId}: ${err.message}`);
            });
        },
    });
}

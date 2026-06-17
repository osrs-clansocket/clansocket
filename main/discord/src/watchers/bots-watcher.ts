import logger from "@clansocket/logger";
import { botRegistry } from "../registries/bot-registry.js";
import { startSseSubscription } from "../shared/sse-subscription.js";

const BOTS_EVENT_MARKER = "event: bots";

export function startBotsWatcher(): () => void {
    return startSseSubscription({
        name: "bots",
        path: "/api/discord/bots/stream",
        eventMarker: BOTS_EVENT_MARKER,
        onEvent: () => {
            botRegistry.reconcile().catch((err: Error) => {
                logger.warn(`Bot reconcile failed: ${err.message}`);
            });
        },
    });
}

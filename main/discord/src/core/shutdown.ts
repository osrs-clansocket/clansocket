import logger from "@clansocket/logger";
import { botRegistry } from "../registries/bot-registry.js";

let isShuttingDown = false;

async function destroyAllBotClients(): Promise<void> {
    for (const state of botRegistry.list()) {
        try {
            if (state.client.isReady()) {
                await state.client.destroy();
                logger.info(`Discord client disconnected (bot_id=${state.identity.bot_id})`);
            }
        } catch (err) {
            logger.error(`Error during client shutdown for ${state.identity.bot_id}: ${(err as Error).message}`);
        }
    }
}

async function shutdown(): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info("Shutting down gracefully...");
    await destroyAllBotClients();
    botRegistry.clear();
    logger.info("Shutdown complete");
    process.exit(0);
}

export default shutdown;

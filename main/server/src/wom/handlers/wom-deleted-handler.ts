import logger from "@clansocket/logger";
import { clearClanWomIdentity } from "../../database/wom/identity/clear-clan-wom-identity.js";
import { cancelWomDispatcher } from "../dispatcher/wom-dispatcher.js";

export async function onWomCredentialsDeleted(clanId: string): Promise<void> {
    cancelWomDispatcher(clanId);
    const cleared = clearClanWomIdentity(clanId);
    if (cleared) {
        logger.info(`[wom] credentials deleted for clan ${clanId}, identity cleared`);
    } else {
        logger.warn(`[wom] credentials deleted for clan ${clanId}, no identity row found`);
    }
    return Promise.resolve();
}

import logger from "@clansocket/logger";
import { getByoBotIdentityForClan } from "../../../database/discord/byo/get-byo-bot-identity.js";
import { invalidateByoBotToken } from "../../../database/discord/byo/invalidate-byo-bot-token.js";

export async function onByoBotCredentialsDeleted(clanId: string): Promise<void> {
    const identity = getByoBotIdentityForClan(clanId);
    if (identity) {
        invalidateByoBotToken(identity.bot_id);
        logger.info(`[discord-byo] credentials deleted for clan ${clanId}, bot ${identity.bot_id} marked invalidated`);
    } else {
        logger.warn(`[discord-byo] credentials deleted for clan ${clanId}, no identity row found`);
    }
    return Promise.resolve();
}

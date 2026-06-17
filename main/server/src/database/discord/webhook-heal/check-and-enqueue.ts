import logger from "@clansocket/logger";
import { getBotApplicationId } from "../identities/get-application-id.js";
import { getWebhookOwnerInfo } from "../webhooks/get-application-id.js";
import { enqueueWebhookHeal } from "./enqueue.js";
import { isWebhookHealPending } from "./is-pending.js";

export interface MaybeHealWebhookInput {
    botId: string;
    clanId: string;
    guildId: string;
    webhookId: string;
}

export function maybeHealWebhook(input: MaybeHealWebhookInput): boolean {
    const owner = getWebhookOwnerInfo(input.clanId, input.guildId, input.webhookId);
    if (owner === null) return false;
    const botAppId = getBotApplicationId(input.botId);
    if (botAppId === null) return false;
    if (owner.applicationId === botAppId) return false;
    if (owner.name === null) {
        logger.warn(`webhook ${input.webhookId} needs heal but has no name; skipping`);
        return false;
    }
    if (isWebhookHealPending(input.webhookId)) {
        logger.info(`webhook heal already pending for ${input.webhookId}; skipping duplicate enqueue`);
        return false;
    }
    enqueueWebhookHeal({
        botId: input.botId,
        botName: null,
        clanId: input.clanId,
        clanName: null,
        guildId: input.guildId,
        oldWebhookId: input.webhookId,
        channelId: owner.channelId,
        name: owner.name,
        avatarUrl: owner.avatarUrl,
    });
    logger.info(`webhook heal enqueued: ${input.webhookId} (app ${owner.applicationId} → bot app ${botAppId})`);
    return true;
}

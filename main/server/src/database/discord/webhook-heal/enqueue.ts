import { enqueueOutboundEvent } from "../outbound/enqueue.js";

const TARGET_KIND = "webhook_heal";

export interface EnqueueWebhookHealInput {
    botId: string;
    botName: string | null;
    clanId: string;
    clanName: string | null;
    guildId: string;
    oldWebhookId: string;
    channelId: string;
    name: string;
    avatarUrl: string | null;
}

export function enqueueWebhookHeal(input: EnqueueWebhookHealInput): string {
    return enqueueOutboundEvent({
        botId: input.botId,
        botName: input.botName,
        guildId: input.guildId,
        clanId: input.clanId,
        clanName: input.clanName,
        targetKind: TARGET_KIND,
        targetId: input.oldWebhookId,
        targetName: input.name,
        payload: {
            oldWebhookId: input.oldWebhookId,
            channelId: input.channelId,
            name: input.name,
            avatarUrl: input.avatarUrl,
        },
    });
}

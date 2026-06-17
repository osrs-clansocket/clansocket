import logger from "@clansocket/logger";
import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { extractWebhookRow } from "../../../state-sync/webhooks/extract.js";
import { extractWebhookTokenIfAvailable, type WebhookTokenSync } from "../../../state-sync/webhooks/extract-token.js";
import { postWebhooksChannelReplace } from "../../../state-sync/webhooks/post-channel-replace.js";
import { isWebhookCapable } from "../../../state-sync/webhooks/webhook-capable-guard.js";

const TRIGGER_ID = "discord:webhooks.updated";

export function wireWebhookUpdateListener(client: Client): void {
    client.on(Events.WebhooksUpdate, async (channel) => {
        if (!isWebhookCapable(channel)) return;
        fire(TRIGGER_ID, {
            guildId: channel.guild.id,
            channelId: channel.id,
        });
        const botId = client.user?.id ?? "";
        try {
            const collection = await channel.fetchWebhooks();
            const list = [...collection.values()];
            const rows = list.map(extractWebhookRow);
            const tokens: WebhookTokenSync[] = [];
            for (const wh of list) {
                const sync = extractWebhookTokenIfAvailable(wh, channel.name ?? null, botId);
                if (sync !== null) tokens.push(sync);
            }
            void postWebhooksChannelReplace(channel.guild.id, channel.id, rows, tokens);
        } catch (err) {
            logger.warn(`webhooks fetch failed for channel ${channel.id}: ${(err as Error).message}`);
        }
    });
}

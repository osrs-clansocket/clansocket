import type { Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";
import { isWebhookCapable } from "../../../state-sync/webhooks/webhook-capable-guard.js";

interface CreateWebhookState {
    channelId: string;
    name: string;
    avatarUrl: string | null;
}

export async function createWebhookHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: string }> {
    if (!row.after_json) throw new Error("create requires after_json");
    const data = JSON.parse(row.after_json) as CreateWebhookState;
    const guild = await client.guilds.fetch(row.guild_id);
    const channel = await guild.channels.fetch(data.channelId);
    if (!isWebhookCapable(channel)) throw new Error(`channel ${data.channelId} not webhook-capable`);
    const webhook = await channel.createWebhook({
        name: data.name,
        avatar: data.avatarUrl ?? undefined,
    });
    return { snowflakeResolved: webhook.id };
}

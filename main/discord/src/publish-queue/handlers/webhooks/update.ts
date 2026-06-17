import type { Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

interface UpdateWebhookState {
    name: string | null;
    channelId: string;
    avatarUrl: string | null;
}

export async function updateWebhookHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: null }> {
    if (!row.after_json) throw new Error("update requires after_json");
    const data = JSON.parse(row.after_json) as UpdateWebhookState;
    const guild = await client.guilds.fetch(row.guild_id);
    const all = await guild.fetchWebhooks();
    const webhook = all.get(row.target_id_or_temp);
    if (!webhook) throw new Error(`webhook ${row.target_id_or_temp} not found`);
    await webhook.edit({
        name: data.name ?? undefined,
        channel: data.channelId,
        avatar: data.avatarUrl ?? undefined,
    });
    return { snowflakeResolved: null };
}

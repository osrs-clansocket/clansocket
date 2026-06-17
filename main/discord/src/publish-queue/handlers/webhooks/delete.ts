import type { Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

export async function deleteWebhookHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: null }> {
    const guild = await client.guilds.fetch(row.guild_id);
    const all = await guild.fetchWebhooks();
    const webhook = all.get(row.target_id_or_temp);
    if (!webhook) throw new Error(`webhook ${row.target_id_or_temp} not found`);
    await webhook.delete();
    return { snowflakeResolved: null };
}

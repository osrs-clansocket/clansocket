import type { Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

export async function deleteServerEmojiHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: null }> {
    const guild = await client.guilds.fetch(row.guild_id);
    const emoji = await guild.emojis.fetch(row.target_id_or_temp);
    if (!emoji) throw new Error(`server emoji ${row.target_id_or_temp} not found`);
    await emoji.delete();
    return { snowflakeResolved: null };
}

import type { Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

interface UpdateServerEmojiState {
    name: string;
    roleIds: readonly string[];
}

export async function updateServerEmojiHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: null }> {
    if (!row.after_json) throw new Error("update requires after_json");
    const data = JSON.parse(row.after_json) as UpdateServerEmojiState;
    const guild = await client.guilds.fetch(row.guild_id);
    const emoji = await guild.emojis.fetch(row.target_id_or_temp);
    if (!emoji) throw new Error(`server emoji ${row.target_id_or_temp} not found`);
    await emoji.edit({
        name: data.name,
        roles: [...data.roleIds],
    });
    return { snowflakeResolved: null };
}

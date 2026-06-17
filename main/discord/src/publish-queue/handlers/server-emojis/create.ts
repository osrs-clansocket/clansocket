import type { Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

interface CreateServerEmojiState {
    name: string;
    imageDataUrl: string;
    roleIds: readonly string[];
}

export async function createServerEmojiHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: string }> {
    if (!row.after_json) throw new Error("create requires after_json");
    const data = JSON.parse(row.after_json) as CreateServerEmojiState;
    const guild = await client.guilds.fetch(row.guild_id);
    const emoji = await guild.emojis.create({
        name: data.name,
        attachment: data.imageDataUrl,
        roles: data.roleIds.length > 0 ? [...data.roleIds] : undefined,
    });
    return { snowflakeResolved: emoji.id };
}

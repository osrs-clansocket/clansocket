import type { Client, GuildChannelCreateOptions } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

interface ChannelCreateState {
    name: string;
    channelType: number;
    topic: string | null;
    nsfw: boolean;
    rateLimitPerUser: number;
    parentId: string | null;
}

export async function createChannelHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: string }> {
    if (!row.after_json) throw new Error("create requires after_json");
    const data = JSON.parse(row.after_json) as ChannelCreateState;
    const guild = await client.guilds.fetch(row.guild_id);
    const opts: GuildChannelCreateOptions = {
        name: data.name,
        type: data.channelType as GuildChannelCreateOptions["type"],
        topic: data.topic ?? undefined,
        nsfw: data.nsfw,
        rateLimitPerUser: data.rateLimitPerUser,
        parent: data.parentId ?? undefined,
    };
    const channel = await guild.channels.create(opts);
    return { snowflakeResolved: channel.id };
}

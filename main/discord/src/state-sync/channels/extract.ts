import type { GuildBasedChannel } from "discord.js";
import type { ChannelRow } from "../types.js";

export function extractChannelRow(channel: GuildBasedChannel | null): ChannelRow | null {
    if (!channel) return null;
    const topic = "topic" in channel && typeof channel.topic === "string" ? channel.topic : null;
    const nsfw = "nsfw" in channel && typeof channel.nsfw === "boolean" ? channel.nsfw : false;
    const position = "position" in channel && typeof channel.position === "number" ? channel.position : null;
    return {
        channel_id: channel.id,
        guild_id: channel.guild.id,
        name: channel.name ?? null,
        type: channel.type,
        parent_id: channel.parentId ?? null,
        position,
        topic,
        nsfw,
    };
}

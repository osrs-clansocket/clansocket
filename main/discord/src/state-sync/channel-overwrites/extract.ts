import { OverwriteType, type GuildBasedChannel } from "discord.js";
import type { ChannelOverwriteRow } from "../types.js";

export function extractChannelOverwrites(channel: GuildBasedChannel): ChannelOverwriteRow[] {
    if (!("permissionOverwrites" in channel)) return [];
    const out: ChannelOverwriteRow[] = [];
    for (const overwrite of channel.permissionOverwrites.cache.values()) {
        const allow = overwrite.allow.bitfield.toString();
        const deny = overwrite.deny.bitfield.toString();
        if (overwrite.type === OverwriteType.Role) {
            out.push({
                kind: "role",
                channel_id: channel.id,
                role_id: overwrite.id,
                guild_id: channel.guild.id,
                allow,
                deny,
            });
        } else {
            out.push({
                kind: "member",
                channel_id: channel.id,
                user_id: overwrite.id,
                guild_id: channel.guild.id,
                allow,
                deny,
            });
        }
    }
    return out;
}

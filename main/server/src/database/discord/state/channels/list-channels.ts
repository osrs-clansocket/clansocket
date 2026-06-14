import { getDiscordGuildDb } from "../../database-discord.js";
import type { ChannelRow } from "../types.js";

const LIST_SQL = `
SELECT channel_id, guild_id, name, type, parent_id, position, topic, nsfw
FROM discord_channels
WHERE guild_id = ?
ORDER BY parent_id IS NOT NULL, parent_id, position ASC
`;

interface ChannelSqlRow {
    channel_id: string;
    guild_id: string;
    name: string | null;
    type: number;
    parent_id: string | null;
    position: number | null;
    topic: string | null;
    nsfw: number;
}

function toChannelRow(r: ChannelSqlRow): ChannelRow {
    return {
        channel_id: r.channel_id,
        guild_id: r.guild_id,
        name: r.name,
        type: r.type,
        parent_id: r.parent_id,
        position: r.position,
        topic: r.topic,
        nsfw: r.nsfw === 1,
    };
}

export function listChannelsForGuild(clanId: string, guildId: string): ChannelRow[] {
    const db = getDiscordGuildDb(clanId, guildId);
    const rows = db.prepare(LIST_SQL).all(guildId) as ChannelSqlRow[];
    return rows.map(toChannelRow);
}

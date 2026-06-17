import { getDiscordGuildDb } from "../../database-discord.js";
import type { ChannelRow } from "../types.js";

const LIST_SQL = `
SELECT channel_id, guild_id, name, type, parent_id, position, topic, nsfw,
       rate_limit_per_user, bitrate, user_limit,
       thread_archived, thread_locked, thread_auto_archive_duration, thread_archive_timestamp, thread_message_count
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
    rate_limit_per_user: number | null;
    bitrate: number | null;
    user_limit: number | null;
    thread_archived: number | null;
    thread_locked: number | null;
    thread_auto_archive_duration: number | null;
    thread_archive_timestamp: number | null;
    thread_message_count: number | null;
}

function intToBool(n: number | null): boolean | null {
    if (n === null) return null;
    return n === 1;
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
        rate_limit_per_user: r.rate_limit_per_user,
        bitrate: r.bitrate,
        user_limit: r.user_limit,
        thread_archived: intToBool(r.thread_archived),
        thread_locked: intToBool(r.thread_locked),
        thread_auto_archive_duration: r.thread_auto_archive_duration,
        thread_archive_timestamp: r.thread_archive_timestamp,
        thread_message_count: r.thread_message_count,
    };
}

export function listChannelsForGuild(clanId: string, guildId: string): ChannelRow[] {
    const db = getDiscordGuildDb(clanId, guildId);
    const rows = db.prepare(LIST_SQL).all(guildId) as ChannelSqlRow[];
    return rows.map(toChannelRow);
}

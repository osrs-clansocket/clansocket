import type { GuildBasedChannel } from "discord.js";
import type { ChannelRow } from "../types.js";

export function extractChannelRow(channel: GuildBasedChannel | null): ChannelRow | null {
    if (!channel) return null;
    const topic = "topic" in channel && typeof channel.topic === "string" ? channel.topic : null;
    const nsfw = "nsfw" in channel && typeof channel.nsfw === "boolean" ? channel.nsfw : false;
    const position = "position" in channel && typeof channel.position === "number" ? channel.position : null;
    const rateLimitPerUser =
        "rateLimitPerUser" in channel && typeof channel.rateLimitPerUser === "number" ? channel.rateLimitPerUser : null;
    const bitrate = "bitrate" in channel && typeof channel.bitrate === "number" ? channel.bitrate : null;
    const userLimit = "userLimit" in channel && typeof channel.userLimit === "number" ? channel.userLimit : null;
    const threadArchived = "archived" in channel && typeof channel.archived === "boolean" ? channel.archived : null;
    const threadLocked = "locked" in channel && typeof channel.locked === "boolean" ? channel.locked : null;
    const threadAutoArchive =
        "autoArchiveDuration" in channel && typeof channel.autoArchiveDuration === "number"
            ? channel.autoArchiveDuration
            : null;
    const threadArchiveTimestamp =
        "archiveTimestamp" in channel && typeof channel.archiveTimestamp === "number" ? channel.archiveTimestamp : null;
    const threadMessageCount =
        "messageCount" in channel && typeof channel.messageCount === "number" ? channel.messageCount : null;
    return {
        channel_id: channel.id,
        guild_id: channel.guild.id,
        name: channel.name ?? null,
        type: channel.type,
        parent_id: channel.parentId ?? null,
        position,
        topic,
        nsfw,
        rate_limit_per_user: rateLimitPerUser,
        bitrate,
        user_limit: userLimit,
        thread_archived: threadArchived,
        thread_locked: threadLocked,
        thread_auto_archive_duration: threadAutoArchive,
        thread_archive_timestamp: threadArchiveTimestamp,
        thread_message_count: threadMessageCount,
    };
}

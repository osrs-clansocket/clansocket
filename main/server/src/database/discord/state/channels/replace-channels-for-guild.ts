import { getDiscordGuildDb } from "../../database-discord.js";
import type { ChannelRow } from "../types.js";

const DELETE_BY_GUILD_SQL = `DELETE FROM discord_channels WHERE guild_id = ?`;
const INSERT_SQL = `
INSERT INTO discord_channels (
    channel_id, guild_id, name, type, parent_id, position, topic, nsfw,
    rate_limit_per_user, bitrate, user_limit,
    thread_archived, thread_locked, thread_auto_archive_duration, thread_archive_timestamp, thread_message_count,
    updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const NSFW_TRUE = 1;
const NSFW_FALSE = 0;

function boolToInt(b: boolean | null): number | null {
    if (b === null) return null;
    return b ? 1 : 0;
}

export function replaceChannelsForGuild(clanId: string, guildId: string, channels: readonly ChannelRow[]): void {
    const db = getDiscordGuildDb(clanId, guildId);
    const now = Date.now();
    const insertStmt = db.prepare(INSERT_SQL);
    const deleteStmt = db.prepare(DELETE_BY_GUILD_SQL);
    const tx = db.transaction(() => {
        deleteStmt.run(guildId);
        for (const c of channels) {
            insertStmt.run(
                c.channel_id,
                c.guild_id,
                c.name,
                c.type,
                c.parent_id,
                c.position,
                c.topic,
                c.nsfw ? NSFW_TRUE : NSFW_FALSE,
                c.rate_limit_per_user,
                c.bitrate,
                c.user_limit,
                boolToInt(c.thread_archived),
                boolToInt(c.thread_locked),
                c.thread_auto_archive_duration,
                c.thread_archive_timestamp,
                c.thread_message_count,
                now,
            );
        }
    });
    tx();
}

import { getDiscordGuildDb } from "../../database-discord.js";
import type { ChannelPinRow } from "../types.js";

const LIST_SQL = `
SELECT message_id, channel_id, guild_id, author_user_id, author_name,
       content, timestamp, attachments_json
FROM discord_channel_pins
WHERE channel_id = ?
ORDER BY timestamp DESC
`;

interface ChannelPinSqlRow {
    message_id: string;
    channel_id: string;
    guild_id: string;
    author_user_id: string | null;
    author_name: string | null;
    content: string | null;
    timestamp: number;
    attachments_json: string;
}

function parseAttachments(json: string): string[] {
    try {
        const parsed = JSON.parse(json) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((v): v is string => typeof v === "string");
    } catch {
        return [];
    }
}

function toChannelPinRow(r: ChannelPinSqlRow): ChannelPinRow {
    return {
        message_id: r.message_id,
        channel_id: r.channel_id,
        guild_id: r.guild_id,
        author_user_id: r.author_user_id,
        author_name: r.author_name,
        content: r.content,
        timestamp: r.timestamp,
        attachments: parseAttachments(r.attachments_json),
    };
}

export function listPinsForChannel(clanId: string, guildId: string, channelId: string): ChannelPinRow[] {
    const db = getDiscordGuildDb(clanId, guildId);
    const rows = db.prepare(LIST_SQL).all(channelId) as ChannelPinSqlRow[];
    return rows.map(toChannelPinRow);
}

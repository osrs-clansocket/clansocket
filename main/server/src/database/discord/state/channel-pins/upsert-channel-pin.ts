import { getDiscordGuildDb } from "../../database-discord.js";
import type { ChannelPinRow } from "../types.js";

const UPSERT_SQL = `
INSERT INTO discord_channel_pins (
    message_id, channel_id, guild_id, author_user_id, author_name,
    content, timestamp, attachments_json, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(message_id) DO UPDATE SET
    channel_id = excluded.channel_id,
    guild_id = excluded.guild_id,
    author_user_id = excluded.author_user_id,
    author_name = excluded.author_name,
    content = excluded.content,
    timestamp = excluded.timestamp,
    attachments_json = excluded.attachments_json,
    updated_at = excluded.updated_at
`;

export function upsertChannelPin(clanId: string, guildId: string, row: ChannelPinRow): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(UPSERT_SQL).run(
        row.message_id,
        row.channel_id,
        row.guild_id,
        row.author_user_id,
        row.author_name,
        row.content,
        row.timestamp,
        JSON.stringify(row.attachments),
        Date.now(),
    );
}

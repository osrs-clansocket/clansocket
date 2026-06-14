import { getDiscordGuildDb } from "../../database-discord.js";
import type { ChannelRow } from "../types.js";

const UPSERT_SQL = `
INSERT INTO discord_channels (channel_id, guild_id, name, type, parent_id, position, topic, nsfw, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(channel_id) DO UPDATE SET
    guild_id = excluded.guild_id,
    name = excluded.name,
    type = excluded.type,
    parent_id = excluded.parent_id,
    position = excluded.position,
    topic = excluded.topic,
    nsfw = excluded.nsfw,
    updated_at = excluded.updated_at
`;

const NSFW_TRUE = 1;
const NSFW_FALSE = 0;

export function upsertChannel(clanId: string, guildId: string, row: ChannelRow): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(UPSERT_SQL).run(
        row.channel_id,
        row.guild_id,
        row.name,
        row.type,
        row.parent_id,
        row.position,
        row.topic,
        row.nsfw ? NSFW_TRUE : NSFW_FALSE,
        Date.now(),
    );
}

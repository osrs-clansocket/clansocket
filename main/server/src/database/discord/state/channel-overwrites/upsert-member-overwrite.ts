import { getDiscordGuildDb } from "../../database-discord.js";
import type { ChannelMemberOverwriteRow } from "../types.js";

const UPSERT_SQL = `
INSERT INTO discord_channel_member_overwrites (channel_id, user_id, guild_id, allow, deny, updated_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(channel_id, user_id) DO UPDATE SET
    guild_id = excluded.guild_id,
    allow = excluded.allow,
    deny = excluded.deny,
    updated_at = excluded.updated_at
`;

export function upsertMemberOverwrite(clanId: string, guildId: string, row: ChannelMemberOverwriteRow): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(UPSERT_SQL).run(row.channel_id, row.user_id, row.guild_id, row.allow, row.deny, Date.now());
}

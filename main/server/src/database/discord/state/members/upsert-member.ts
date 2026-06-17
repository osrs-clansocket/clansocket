import { getDiscordGuildDb } from "../../database-discord.js";
import type { MemberRow } from "../types.js";

const UPSERT_SQL = `
INSERT INTO discord_members (
    user_id, guild_id, name, display_name, nickname,
    joined_at, premium_since, communication_disabled_until,
    is_boosting, is_bot, role_ids_json, avatar_url, pending, flags, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(user_id) DO UPDATE SET
    guild_id = excluded.guild_id,
    name = excluded.name,
    display_name = excluded.display_name,
    nickname = excluded.nickname,
    joined_at = excluded.joined_at,
    premium_since = excluded.premium_since,
    communication_disabled_until = excluded.communication_disabled_until,
    is_boosting = excluded.is_boosting,
    is_bot = excluded.is_bot,
    role_ids_json = excluded.role_ids_json,
    avatar_url = excluded.avatar_url,
    pending = excluded.pending,
    flags = excluded.flags,
    updated_at = excluded.updated_at
`;

const FLAG_TRUE = 1;
const FLAG_FALSE = 0;

export function upsertMember(clanId: string, guildId: string, row: MemberRow): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(UPSERT_SQL).run(
        row.user_id,
        row.guild_id,
        row.name,
        row.display_name,
        row.nickname,
        row.joined_at,
        row.premium_since,
        row.communication_disabled_until,
        row.is_boosting ? FLAG_TRUE : FLAG_FALSE,
        row.is_bot ? FLAG_TRUE : FLAG_FALSE,
        JSON.stringify(row.role_ids),
        row.avatar_url,
        row.pending ? FLAG_TRUE : FLAG_FALSE,
        row.flags,
        Date.now(),
    );
}

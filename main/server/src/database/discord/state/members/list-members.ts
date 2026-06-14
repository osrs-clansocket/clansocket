import { getDiscordGuildDb } from "../../database-discord.js";
import type { MemberRow } from "../types.js";

const LIST_SQL = `
SELECT user_id, guild_id, name, display_name, nickname,
       joined_at, premium_since, communication_disabled_until,
       is_boosting, is_bot, role_ids_json, avatar_url
FROM discord_members
WHERE guild_id = ?
ORDER BY LOWER(COALESCE(nickname, display_name, name)) ASC
`;

interface MemberSqlRow {
    user_id: string;
    guild_id: string;
    name: string;
    display_name: string | null;
    nickname: string | null;
    joined_at: number | null;
    premium_since: number | null;
    communication_disabled_until: number | null;
    is_boosting: number;
    is_bot: number;
    role_ids_json: string;
    avatar_url: string | null;
}

const FLAG_TRUE = 1;

function parseRoleIds(json: string): string[] {
    try {
        const parsed = JSON.parse(json) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((v): v is string => typeof v === "string");
    } catch {
        return [];
    }
}

function toMemberRow(r: MemberSqlRow): MemberRow {
    return {
        user_id: r.user_id,
        guild_id: r.guild_id,
        name: r.name,
        display_name: r.display_name,
        nickname: r.nickname,
        joined_at: r.joined_at,
        premium_since: r.premium_since,
        communication_disabled_until: r.communication_disabled_until,
        is_boosting: r.is_boosting === FLAG_TRUE,
        is_bot: r.is_bot === FLAG_TRUE,
        role_ids: parseRoleIds(r.role_ids_json),
        avatar_url: r.avatar_url,
    };
}

export function listMembersForGuild(clanId: string, guildId: string): MemberRow[] {
    const db = getDiscordGuildDb(clanId, guildId);
    const rows = db.prepare(LIST_SQL).all(guildId) as MemberSqlRow[];
    return rows.map(toMemberRow);
}

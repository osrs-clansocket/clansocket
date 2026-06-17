import { getDiscordGuildDb } from "../../database-discord.js";
import type { RoleRow } from "../types.js";

const LIST_SQL = `
SELECT role_id, guild_id, name, color, hoist, mentionable, position, permissions, managed, icon_url, unicode_emoji
FROM discord_roles
WHERE guild_id = ?
ORDER BY position DESC
`;

interface RoleSqlRow {
    role_id: string;
    guild_id: string;
    name: string;
    color: number;
    hoist: number;
    mentionable: number;
    position: number;
    permissions: string;
    managed: number;
    icon_url: string | null;
    unicode_emoji: string | null;
}

function toRoleRow(r: RoleSqlRow): RoleRow {
    return {
        role_id: r.role_id,
        guild_id: r.guild_id,
        name: r.name,
        color: r.color,
        hoist: r.hoist === 1,
        mentionable: r.mentionable === 1,
        position: r.position,
        permissions: r.permissions,
        managed: r.managed === 1,
        icon_url: r.icon_url,
        unicode_emoji: r.unicode_emoji,
    };
}

export function listRolesForGuild(clanId: string, guildId: string): RoleRow[] {
    const db = getDiscordGuildDb(clanId, guildId);
    const rows = db.prepare(LIST_SQL).all(guildId) as RoleSqlRow[];
    return rows.map(toRoleRow);
}

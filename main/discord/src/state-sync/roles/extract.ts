import type { Role } from "discord.js";
import type { RoleRow } from "../types.js";

export function extractRoleRow(role: Role): RoleRow {
    return {
        role_id: role.id,
        guild_id: role.guild.id,
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        managed: role.managed,
        icon_url: role.iconURL() ?? null,
        unicode_emoji: role.unicodeEmoji ?? null,
    };
}

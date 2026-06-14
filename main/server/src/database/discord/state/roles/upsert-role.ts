import { getDiscordGuildDb } from "../../database-discord.js";
import type { RoleRow } from "../types.js";

const UPSERT_SQL = `
INSERT INTO discord_roles (role_id, guild_id, name, color, hoist, mentionable, position, permissions, managed, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(role_id) DO UPDATE SET
    guild_id = excluded.guild_id,
    name = excluded.name,
    color = excluded.color,
    hoist = excluded.hoist,
    mentionable = excluded.mentionable,
    position = excluded.position,
    permissions = excluded.permissions,
    managed = excluded.managed,
    updated_at = excluded.updated_at
`;

const BOOL_TRUE = 1;
const BOOL_FALSE = 0;

export function upsertRole(clanId: string, guildId: string, row: RoleRow): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(UPSERT_SQL).run(
        row.role_id,
        row.guild_id,
        row.name,
        row.color,
        row.hoist ? BOOL_TRUE : BOOL_FALSE,
        row.mentionable ? BOOL_TRUE : BOOL_FALSE,
        row.position,
        row.permissions,
        row.managed ? BOOL_TRUE : BOOL_FALSE,
        Date.now(),
    );
}

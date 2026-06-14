import { getDiscordGuildDb } from "../../database-discord.js";
import type { RoleRow } from "../types.js";

const DELETE_BY_GUILD_SQL = `DELETE FROM discord_roles WHERE guild_id = ?`;
const INSERT_SQL = `
INSERT INTO discord_roles (role_id, guild_id, name, color, hoist, mentionable, position, permissions, managed, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const BOOL_TRUE = 1;
const BOOL_FALSE = 0;

export function replaceRolesForGuild(clanId: string, guildId: string, roles: readonly RoleRow[]): void {
    const db = getDiscordGuildDb(clanId, guildId);
    const now = Date.now();
    const insertStmt = db.prepare(INSERT_SQL);
    const deleteStmt = db.prepare(DELETE_BY_GUILD_SQL);
    const tx = db.transaction(() => {
        deleteStmt.run(guildId);
        for (const r of roles) {
            insertStmt.run(
                r.role_id,
                r.guild_id,
                r.name,
                r.color,
                r.hoist ? BOOL_TRUE : BOOL_FALSE,
                r.mentionable ? BOOL_TRUE : BOOL_FALSE,
                r.position,
                r.permissions,
                r.managed ? BOOL_TRUE : BOOL_FALSE,
                now,
            );
        }
    });
    tx();
}

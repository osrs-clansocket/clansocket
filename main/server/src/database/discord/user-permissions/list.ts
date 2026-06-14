import { getDiscordGuildDb } from "../../core/database.js";

interface PermissionRow {
    permission_key: string;
}

export function listForUser(clanId: string, guildId: string, userId: string): string[] {
    const db = getDiscordGuildDb(clanId, guildId);
    const rows = db
        .prepare(
            `SELECT permission_key FROM discord_user_permissions WHERE guild_id = ? AND user_id = ? AND revoked_at IS NULL`,
        )
        .all(guildId, userId) as PermissionRow[];
    return rows.map((r) => r.permission_key);
}

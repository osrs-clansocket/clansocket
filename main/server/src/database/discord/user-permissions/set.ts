import { getDiscordGuildDb } from "../../core/database.js";

export interface SetPermissionsParams {
    clanId: string;
    guildId: string;
    userId: string;
    permissions: string[];
    grantedBySiteAccountId: string;
    grantedBySiteAccountName: string | null;
}

export function setForUser(params: SetPermissionsParams): void {
    const db = getDiscordGuildDb(params.clanId, params.guildId);
    const now = Date.now();
    db.transaction(() => {
        db.prepare(
            `UPDATE discord_user_permissions SET revoked_at = ? WHERE guild_id = ? AND user_id = ? AND revoked_at IS NULL`,
        ).run(now, params.guildId, params.userId);
        for (const key of params.permissions) {
            db.prepare(
                `INSERT OR REPLACE INTO discord_user_permissions (guild_id, user_id, permission_key, granted_at, granted_by_site_account_id, granted_by_site_account_name, revoked_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
            ).run(
                params.guildId,
                params.userId,
                key,
                now,
                params.grantedBySiteAccountId,
                params.grantedBySiteAccountName,
                now,
            );
        }
    })();
}

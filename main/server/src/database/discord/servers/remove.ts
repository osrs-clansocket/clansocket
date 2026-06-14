import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

export interface RemoveServerParams {
    guildId: string;
    clanId: string;
    removerSiteAccountId: string;
    removerSiteAccountName: string | null;
}

export function removeServer(params: RemoveServerParams): boolean {
    const botDb = getDb(DB_NAMES.DISCORD_BOT);
    const now = Date.now();
    const result = botDb
        .prepare(
            `UPDATE discord_servers
             SET removed_at = ?, remover_user_id = ?, remover_user_name = ?, updated_at = ?
             WHERE guild_id = ? AND clan_id = ? AND removed_at IS NULL`,
        )
        .run(now, params.removerSiteAccountId, params.removerSiteAccountName, now, params.guildId, params.clanId);
    return result.changes > 0;
}

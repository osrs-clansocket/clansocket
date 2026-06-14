import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

interface ClanIdRow {
    clan_id: string;
}

export function resolveClanIdForGuild(guildId: string): string | null {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const row = db
        .prepare(`SELECT clan_id FROM discord_servers WHERE guild_id = ? AND removed_at IS NULL`)
        .get(guildId) as ClanIdRow | undefined;
    return row?.clan_id ?? null;
}

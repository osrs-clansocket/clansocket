import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

export interface ClanServerRow {
    guild_id: string;
    guild_name: string;
    bot_id: string;
    bot_name: string;
    installed_at: number;
    features: string;
}

export function listByClan(clanId: string): ClanServerRow[] {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    return db
        .prepare(
            `SELECT guild_id, guild_name, bot_id, bot_name, installed_at, features FROM discord_servers WHERE clan_id = ? AND removed_at IS NULL ORDER BY installed_at ASC`,
        )
        .all(clanId) as ClanServerRow[];
}

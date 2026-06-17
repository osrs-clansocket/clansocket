import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

export interface ServerRoutingRow {
    guild_id: string;
    clan_id: string;
    bot_id: string;
}

const SQL = `SELECT guild_id, clan_id, bot_id FROM discord_servers WHERE guild_id = ?`;

export function getServerByGuildId(guildId: string): ServerRoutingRow | null {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const row = db.prepare(SQL).get(guildId) as ServerRoutingRow | undefined;
    return row ?? null;
}

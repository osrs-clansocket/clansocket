import { DB_NAMES } from "../core/database-state.js";
import { getDb } from "../core/database.js";
import type { RoutedServerRow } from "./types.js";

export function resolveServerByGuildId(guildId: string): RoutedServerRow | null {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const row = db
        .prepare(
            `SELECT guild_id, guild_name, clan_id, clan_name, bot_id, bot_name, setup_status FROM discord_servers WHERE guild_id = ? AND removed_at IS NULL`,
        )
        .get(guildId) as RoutedServerRow | undefined;
    return row ?? null;
}

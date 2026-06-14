import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

export function updateServerFeatures(guildId: string, features: readonly string[]): void {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    db.prepare(`UPDATE discord_servers SET features = ? WHERE guild_id = ?`).run(JSON.stringify(features), guildId);
}

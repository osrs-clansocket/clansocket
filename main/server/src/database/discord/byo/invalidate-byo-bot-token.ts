import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

const SQL = `UPDATE discord_bot_identities
    SET token_invalidated_at = $now, updated_at = $now
    WHERE bot_id = $botId`;

export function invalidateByoBotToken(botId: string): void {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    db.prepare(SQL).run({ now: Date.now(), botId });
}

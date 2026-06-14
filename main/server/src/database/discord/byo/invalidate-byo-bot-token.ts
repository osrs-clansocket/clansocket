import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

const SQL = `UPDATE discord_bot_identities
    SET token_invalidated_at = ?, updated_at = ?
    WHERE bot_id = ?`;

export function invalidateByoBotToken(botId: string): void {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const now = Date.now();
    db.prepare(SQL).run(now, now, botId);
}

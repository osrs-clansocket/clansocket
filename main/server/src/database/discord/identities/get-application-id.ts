import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

const SELECT_SQL = `SELECT application_id FROM discord_bot_identities WHERE bot_id = ?`;

export function getBotApplicationId(botId: string): string | null {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const row = db.prepare(SELECT_SQL).get(botId) as { application_id: string | null } | undefined;
    return row?.application_id ?? null;
}

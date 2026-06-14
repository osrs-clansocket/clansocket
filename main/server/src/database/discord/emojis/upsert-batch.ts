import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

const INSERT_SQL = `INSERT INTO discord_application_emojis (bot_id, emoji_id, name, animated, public_path, updated_at) VALUES (?, ?, ?, ?, ?, ?)`;
const DELETE_BY_BOT_SQL = `DELETE FROM discord_application_emojis WHERE bot_id = ?`;
const ANIMATED_TRUE = 1;
const ANIMATED_FALSE = 0;

export interface EmojiInput {
    botId: string;
    emojiId: string;
    name: string;
    animated: boolean;
    publicPath: string | null;
}

export function replaceEmojisForBot(botId: string, emojis: EmojiInput[]): void {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const now = Date.now();
    const insertStmt = db.prepare(INSERT_SQL);
    const deleteStmt = db.prepare(DELETE_BY_BOT_SQL);
    const tx = db.transaction(() => {
        deleteStmt.run(botId);
        for (const e of emojis) {
            insertStmt.run(e.botId, e.emojiId, e.name, e.animated ? ANIMATED_TRUE : ANIMATED_FALSE, e.publicPath, now);
        }
    });
    tx();
}

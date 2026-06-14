import { listDiscordBotRows } from "../db-runners.js";

export interface EmojiRow {
    bot_id: string;
    emoji_id: string;
    name: string;
    animated: number;
    public_path: string | null;
    updated_at: number;
}

const SELECT_COLUMNS = `bot_id, emoji_id, name, animated, public_path, updated_at`;

export function listAllEmojis(): EmojiRow[] {
    return listDiscordBotRows<EmojiRow>(
        `SELECT ${SELECT_COLUMNS} FROM discord_application_emojis ORDER BY bot_id ASC, name ASC`,
    );
}

export function listEmojisForBot(botId: string): EmojiRow[] {
    return listDiscordBotRows<EmojiRow>(
        `SELECT ${SELECT_COLUMNS} FROM discord_application_emojis WHERE bot_id = ? ORDER BY name ASC`,
        botId,
    );
}

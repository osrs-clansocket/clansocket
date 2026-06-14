import { getDiscordGuildDb } from "../../database-discord.js";
import type { ServerEmojiRow } from "../types.js";
import { upsertServerEmoji } from "./upsert-server-emoji.js";

const DELETE_ALL_SQL = `DELETE FROM discord_server_emojis WHERE guild_id = ?`;

export function replaceServerEmojisForGuild(
    clanId: string,
    guildId: string,
    rows: readonly ServerEmojiRow[],
): void {
    const db = getDiscordGuildDb(clanId, guildId);
    const tx = db.transaction(() => {
        db.prepare(DELETE_ALL_SQL).run(guildId);
        for (const row of rows) upsertServerEmoji(clanId, guildId, row);
    });
    tx();
}

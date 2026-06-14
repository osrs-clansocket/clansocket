import { getDiscordGuildDb } from "../../database-discord.js";
import type { ServerStickerRow } from "../types.js";
import { upsertServerSticker } from "./upsert-server-sticker.js";

const DELETE_ALL_SQL = `DELETE FROM discord_server_stickers WHERE guild_id = ?`;

export function replaceServerStickersForGuild(
    clanId: string,
    guildId: string,
    rows: readonly ServerStickerRow[],
): void {
    const db = getDiscordGuildDb(clanId, guildId);
    const tx = db.transaction(() => {
        db.prepare(DELETE_ALL_SQL).run(guildId);
        for (const row of rows) upsertServerSticker(clanId, guildId, row);
    });
    tx();
}

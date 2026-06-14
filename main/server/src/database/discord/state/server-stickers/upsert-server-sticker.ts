import { getDiscordGuildDb } from "../../database-discord.js";
import type { ServerStickerRow } from "../types.js";

const UPSERT_SQL = `
INSERT INTO discord_server_stickers (
    sticker_id, guild_id, name, description, tags,
    format_type, available, image_url, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(sticker_id) DO UPDATE SET
    guild_id = excluded.guild_id,
    name = excluded.name,
    description = excluded.description,
    tags = excluded.tags,
    format_type = excluded.format_type,
    available = excluded.available,
    image_url = excluded.image_url,
    updated_at = excluded.updated_at
`;

const FLAG_TRUE = 1;
const FLAG_FALSE = 0;

export function upsertServerSticker(clanId: string, guildId: string, row: ServerStickerRow): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(UPSERT_SQL).run(
        row.sticker_id,
        row.guild_id,
        row.name,
        row.description,
        row.tags,
        row.format_type,
        row.available ? FLAG_TRUE : FLAG_FALSE,
        row.image_url,
        Date.now(),
    );
}

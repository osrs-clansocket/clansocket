import type { Sticker } from "discord.js";
import type { ServerStickerRow } from "../types.js";

export function extractServerStickerRow(sticker: Sticker): ServerStickerRow {
    return {
        sticker_id: sticker.id,
        guild_id: sticker.guildId ?? "",
        name: sticker.name,
        description: sticker.description,
        tags: sticker.tags,
        format_type: sticker.format,
        available: sticker.available ?? true,
        image_url: sticker.url,
        user_id: sticker.user?.id ?? null,
    };
}

import type { GuildEmoji } from "discord.js";
import type { ServerEmojiRow } from "../types.js";

export function extractServerEmojiRow(emoji: GuildEmoji): ServerEmojiRow {
    return {
        emoji_id: emoji.id,
        guild_id: emoji.guild.id,
        name: emoji.name ?? "",
        role_ids: [...emoji.roles.cache.keys()],
        animated: emoji.animated ?? false,
        available: emoji.available ?? true,
        managed: emoji.managed ?? false,
        image_url: emoji.imageURL(),
        user_id: emoji.author?.id ?? null,
    };
}

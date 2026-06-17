import type { Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

interface UpdateServerStickerState {
    name: string;
    description: string | null;
    tags: string | null;
}

export async function updateServerStickerHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: null }> {
    if (!row.after_json) throw new Error("update requires after_json");
    const data = JSON.parse(row.after_json) as UpdateServerStickerState;
    const guild = await client.guilds.fetch(row.guild_id);
    const sticker = await guild.stickers.fetch(row.target_id_or_temp);
    if (!sticker) throw new Error(`server sticker ${row.target_id_or_temp} not found`);
    await sticker.edit({
        name: data.name,
        description: data.description ?? undefined,
        tags: data.tags ?? undefined,
    });
    return { snowflakeResolved: null };
}

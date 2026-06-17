import type { Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

export async function deleteServerStickerHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: null }> {
    const guild = await client.guilds.fetch(row.guild_id);
    const sticker = await guild.stickers.fetch(row.target_id_or_temp);
    if (!sticker) throw new Error(`server sticker ${row.target_id_or_temp} not found`);
    await sticker.delete();
    return { snowflakeResolved: null };
}

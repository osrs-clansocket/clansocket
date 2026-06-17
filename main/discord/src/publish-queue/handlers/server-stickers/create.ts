import type { Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

interface CreateServerStickerState {
    name: string;
    imageDataUrl: string;
    description: string | null;
    tags: string | null;
    formatType: number;
}

export async function createServerStickerHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: string }> {
    if (!row.after_json) throw new Error("create requires after_json");
    const data = JSON.parse(row.after_json) as CreateServerStickerState;
    const guild = await client.guilds.fetch(row.guild_id);
    const sticker = await guild.stickers.create({
        name: data.name,
        file: data.imageDataUrl,
        description: data.description ?? undefined,
        tags: data.tags ?? data.name,
    });
    return { snowflakeResolved: sticker.id };
}

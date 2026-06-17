import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { extractServerStickerRow } from "../../../state-sync/server-stickers/extract.js";
import { postServerStickerUpsert } from "../../../state-sync/server-stickers/post-upsert.js";

const TRIGGER_ID = "discord:server-stickers.created";

export function wireServerStickerCreateListener(client: Client): void {
    client.on(Events.GuildStickerCreate, (sticker) => {
        if (!sticker.guildId) return;
        fire(TRIGGER_ID, {
            id: sticker.id,
            name: sticker.name,
            guildId: sticker.guildId,
        });
        const row = extractServerStickerRow(sticker);
        void postServerStickerUpsert(sticker.guildId, row);
    });
}

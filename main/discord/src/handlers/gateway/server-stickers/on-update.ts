import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { extractServerStickerRow } from "../../../state-sync/server-stickers/extract.js";
import { postServerStickerUpsert } from "../../../state-sync/server-stickers/post-upsert.js";

const TRIGGER_ID = "discord:server-stickers.updated";

export function wireServerStickerUpdateListener(client: Client): void {
    client.on(Events.GuildStickerUpdate, (_oldSticker, newSticker) => {
        if (!newSticker.guildId) return;
        fire(TRIGGER_ID, {
            id: newSticker.id,
            name: newSticker.name,
            guildId: newSticker.guildId,
        });
        const row = extractServerStickerRow(newSticker);
        void postServerStickerUpsert(newSticker.guildId, row);
    });
}

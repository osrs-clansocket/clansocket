import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { postServerStickerDelete } from "../../../state-sync/server-stickers/post-delete.js";

const TRIGGER_ID = "discord:server-stickers.deleted";

export function wireServerStickerDeleteListener(client: Client): void {
    client.on(Events.GuildStickerDelete, (sticker) => {
        if (!sticker.guildId) return;
        fire(TRIGGER_ID, {
            id: sticker.id,
            name: sticker.name,
            guildId: sticker.guildId,
        });
        void postServerStickerDelete(sticker.guildId, sticker.id);
    });
}

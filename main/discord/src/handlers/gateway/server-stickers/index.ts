import type { Client } from "discord.js";
import { wireServerStickerCreateListener } from "./on-create.js";
import { wireServerStickerDeleteListener } from "./on-delete.js";
import { wireServerStickerUpdateListener } from "./on-update.js";

export function wireServerStickerGatewayListeners(client: Client): void {
    wireServerStickerCreateListener(client);
    wireServerStickerUpdateListener(client);
    wireServerStickerDeleteListener(client);
}

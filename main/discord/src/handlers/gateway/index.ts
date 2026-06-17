import type { Client } from "discord.js";
import { wireChannelGatewayListeners } from "./channels/index.js";
import { wireGuildGatewayListeners } from "./guild/index.js";
import { wireMemberGatewayListeners } from "./members/index.js";
import { wireRoleGatewayListeners } from "./roles/index.js";
import { wireServerEmojiGatewayListeners } from "./server-emojis/index.js";
import { wireServerStickerGatewayListeners } from "./server-stickers/index.js";
import { wireWebhookGatewayListeners } from "./webhooks/index.js";

export function wireAllGatewayListeners(client: Client): void {
    wireChannelGatewayListeners(client);
    wireRoleGatewayListeners(client);
    wireMemberGatewayListeners(client);
    wireWebhookGatewayListeners(client);
    wireServerEmojiGatewayListeners(client);
    wireServerStickerGatewayListeners(client);
    wireGuildGatewayListeners(client);
}

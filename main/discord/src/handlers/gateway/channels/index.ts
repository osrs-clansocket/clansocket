import type { Client } from "discord.js";
import { wireChannelCreateListener } from "./on-create.js";
import { wireChannelDeleteListener } from "./on-delete.js";
import { wireChannelUpdateListener } from "./on-update.js";

export function wireChannelGatewayListeners(client: Client): void {
    wireChannelCreateListener(client);
    wireChannelUpdateListener(client);
    wireChannelDeleteListener(client);
}

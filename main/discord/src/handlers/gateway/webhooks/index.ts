import type { Client } from "discord.js";
import { wireWebhookUpdateListener } from "./on-update.js";

export function wireWebhookGatewayListeners(client: Client): void {
    wireWebhookUpdateListener(client);
}

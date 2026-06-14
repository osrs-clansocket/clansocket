import type { Client } from "discord.js";
import { wireGuildUpdateListener } from "./on-update.js";

export function wireGuildGatewayListeners(client: Client): void {
    wireGuildUpdateListener(client);
}

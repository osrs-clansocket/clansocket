import type { Client } from "discord.js";
import { wireChannelGatewayListeners } from "./channels/index.js";
import { wireGuildGatewayListeners } from "./guild/index.js";
import { wireMemberGatewayListeners } from "./members/index.js";
import { wireRoleGatewayListeners } from "./roles/index.js";

export function wireAllGatewayListeners(client: Client): void {
    wireChannelGatewayListeners(client);
    wireRoleGatewayListeners(client);
    wireMemberGatewayListeners(client);
    wireGuildGatewayListeners(client);
}

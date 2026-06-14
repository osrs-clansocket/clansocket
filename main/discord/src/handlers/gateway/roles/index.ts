import type { Client } from "discord.js";
import { wireRoleCreateListener } from "./on-create.js";
import { wireRoleDeleteListener } from "./on-delete.js";
import { wireRoleUpdateListener } from "./on-update.js";

export function wireRoleGatewayListeners(client: Client): void {
    wireRoleCreateListener(client);
    wireRoleUpdateListener(client);
    wireRoleDeleteListener(client);
}

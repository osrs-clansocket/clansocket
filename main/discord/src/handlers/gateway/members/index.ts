import type { Client } from "discord.js";
import { wireMemberCreateListener } from "./on-create.js";
import { wireMemberDeleteListener } from "./on-delete.js";
import { wireMemberUpdateListener } from "./on-update.js";

export function wireMemberGatewayListeners(client: Client): void {
    wireMemberCreateListener(client);
    wireMemberUpdateListener(client);
    wireMemberDeleteListener(client);
}

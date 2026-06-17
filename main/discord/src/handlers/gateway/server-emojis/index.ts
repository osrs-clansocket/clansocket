import type { Client } from "discord.js";
import { wireServerEmojiCreateListener } from "./on-create.js";
import { wireServerEmojiDeleteListener } from "./on-delete.js";
import { wireServerEmojiUpdateListener } from "./on-update.js";

export function wireServerEmojiGatewayListeners(client: Client): void {
    wireServerEmojiCreateListener(client);
    wireServerEmojiUpdateListener(client);
    wireServerEmojiDeleteListener(client);
}

import { registerChannelHandlers } from "./channels/index.js";
import { registerGuildSettingsHandlers } from "./guild-settings/index.js";
import { registerMemberHandlers } from "./members/index.js";
import { registerRoleHandlers } from "./roles/index.js";
import { registerServerEmojiHandlers } from "./server-emojis/index.js";
import { registerServerStickerHandlers } from "./server-stickers/index.js";
import { registerWebhookHandlers } from "./webhooks/index.js";

export function registerAllPublishHandlers(): void {
    registerChannelHandlers();
    registerRoleHandlers();
    registerMemberHandlers();
    registerWebhookHandlers();
    registerServerEmojiHandlers();
    registerServerStickerHandlers();
    registerGuildSettingsHandlers();
}

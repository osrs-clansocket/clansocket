import { PermissionsBitField } from "discord.js";
import { registerPublisher } from "../../dispatcher.js";
import { createWebhookHandler } from "./create.js";
import { deleteWebhookHandler } from "./delete.js";
import { updateWebhookHandler } from "./update.js";

const TARGET_KIND = "discord_webhook";

export function registerWebhookHandlers(): void {
    registerPublisher("create", TARGET_KIND, {
        handler: createWebhookHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageWebhooks,
    });
    registerPublisher("update", TARGET_KIND, {
        handler: updateWebhookHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageWebhooks,
    });
    registerPublisher("delete", TARGET_KIND, {
        handler: deleteWebhookHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageWebhooks,
    });
}

import { PermissionsBitField } from "discord.js";
import { registerPublisher } from "../../dispatcher.js";
import { createServerEmojiHandler } from "./create.js";
import { deleteServerEmojiHandler } from "./delete.js";
import { updateServerEmojiHandler } from "./update.js";

const TARGET_KIND = "discord_server_emoji";

export function registerServerEmojiHandlers(): void {
    registerPublisher("create", TARGET_KIND, {
        handler: createServerEmojiHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageGuildExpressions,
    });
    registerPublisher("update", TARGET_KIND, {
        handler: updateServerEmojiHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageGuildExpressions,
    });
    registerPublisher("delete", TARGET_KIND, {
        handler: deleteServerEmojiHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageGuildExpressions,
    });
}

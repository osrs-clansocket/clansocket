import { PermissionsBitField } from "discord.js";
import { registerPublisher } from "../../dispatcher.js";
import { createServerStickerHandler } from "./create.js";
import { deleteServerStickerHandler } from "./delete.js";
import { updateServerStickerHandler } from "./update.js";

const TARGET_KIND = "discord_server_sticker";

export function registerServerStickerHandlers(): void {
    registerPublisher("create", TARGET_KIND, {
        handler: createServerStickerHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageGuildExpressions,
    });
    registerPublisher("update", TARGET_KIND, {
        handler: updateServerStickerHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageGuildExpressions,
    });
    registerPublisher("delete", TARGET_KIND, {
        handler: deleteServerStickerHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageGuildExpressions,
    });
}

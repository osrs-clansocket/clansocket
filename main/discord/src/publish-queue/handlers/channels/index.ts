import { PermissionsBitField } from "discord.js";
import { registerPublisher } from "../../dispatcher.js";
import { createChannelHandler } from "./create.js";
import { deleteChannelHandler } from "./delete.js";
import { updateChannelHandler } from "./update.js";

const TARGET_KIND = "discord_channel";

export function registerChannelHandlers(): void {
    registerPublisher("create", TARGET_KIND, {
        handler: createChannelHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageChannels,
    });
    registerPublisher("update", TARGET_KIND, {
        handler: updateChannelHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageChannels,
    });
    registerPublisher("delete", TARGET_KIND, {
        handler: deleteChannelHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageChannels,
    });
}

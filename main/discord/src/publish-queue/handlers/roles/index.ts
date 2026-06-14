import { PermissionsBitField } from "discord.js";
import { registerPublisher } from "../../dispatcher.js";
import { createRoleHandler } from "./create.js";
import { deleteRoleHandler } from "./delete.js";
import { updateRoleHandler } from "./update.js";

const TARGET_KIND = "discord_role";

export function registerRoleHandlers(): void {
    registerPublisher("create", TARGET_KIND, {
        handler: createRoleHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageRoles,
    });
    registerPublisher("update", TARGET_KIND, {
        handler: updateRoleHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageRoles,
    });
    registerPublisher("delete", TARGET_KIND, {
        handler: deleteRoleHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageRoles,
    });
}

import { PermissionsBitField } from "discord.js";
import { registerPublisher } from "../../dispatcher.js";
import { updateGuildSettingsHandler } from "./update.js";

const TARGET_KIND = "discord_guild_settings";

export function registerGuildSettingsHandlers(): void {
    registerPublisher("update", TARGET_KIND, {
        handler: updateGuildSettingsHandler,
        requiredBotPermission: PermissionsBitField.Flags.ManageGuild,
    });
}

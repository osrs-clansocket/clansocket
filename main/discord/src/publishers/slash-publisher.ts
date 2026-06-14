import { REST, Routes } from "discord.js";
import { SECONDS_30_MS } from "../core/constants.js";
import { getSlashCommandData } from "../handlers/slash.js";
import type { BotIdentity } from "../shared/types/bot-types.js";

const REST_TIMEOUT_MS = SECONDS_30_MS;

export async function publishSlashCommands(identity: BotIdentity, guildId: string): Promise<void> {
    const rest = new REST({ version: "10", timeout: REST_TIMEOUT_MS }).setToken(identity.token);
    await rest.put(Routes.applicationGuildCommands(identity.application_id, guildId), {
        body: getSlashCommandData(),
    });
}

import logger from "@clansocket/logger";
import type { Client, PermissionResolvable } from "discord.js";

export interface BotPermissionInput {
    client: Client;
    guildId: string;
    requiredPermission: PermissionResolvable;
}

export async function validateBotPermission(input: BotPermissionInput): Promise<boolean> {
    try {
        const guild = await input.client.guilds.fetch(input.guildId);
        const me = await guild.members.fetchMe();
        return me.permissions.has(input.requiredPermission);
    } catch (err: any) {
        logger.warn(`Bot permission check failed for guild ${input.guildId}: ${err.message}`);
        return false;
    }
}

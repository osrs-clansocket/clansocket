import logger from "@clansocket/logger";
import type { Interaction } from "discord.js";
import { apiRequest } from "../fetchers/api-fetcher.js";

const INTERACTION_KIND_BY_TYPE: Record<number, string> = {
    1: "ping",
    2: "application_command",
    3: "message_component",
    4: "application_command_autocomplete",
    5: "modal_submit",
};

export async function trackInteractionPending(interaction: Interaction): Promise<void> {
    try {
        const kind = INTERACTION_KIND_BY_TYPE[interaction.type] ?? "unknown";
        const body = {
            interactionId: interaction.id,
            botId: interaction.applicationId,
            guildId: interaction.guildId,
            channelId: interaction.channelId ?? "",
            userId: interaction.user.id,
            kind,
            token: interaction.token,
        };
        await apiRequest("POST", "/api/discord/interactions", body);
    } catch (err: any) {
        logger.warn(`Interaction TTL tracking failed: ${err.message}`);
    }
}

export async function triggerInteractionCleanup(): Promise<void> {
    try {
        await apiRequest("POST", "/api/discord/interactions/cleanup");
    } catch (err: any) {
        logger.warn(`Interaction cleanup failed: ${err.message}`);
    }
}

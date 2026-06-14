import { postAuditLog as insertAuditLog } from "../../core/api-client.js";
import { AUDIT_ACTIONS, HANDLER_MESSAGES } from "../../core/constants.js";
import { ephemeralReply, replyOrEdit } from "../interaction-reply.js";
import { enforceRateLimitForTarget } from "../rate-limit.js";
import { acceptsEvent } from "../plugin/filter.js";
import { runPluginErrorHandler } from "../plugin/error-handler.js";
import type { BotContext } from "../../shared/types/bot-types.js";
import logger from "@clansocket/logger";
import { interactionPlugins } from "./plugins.js";

const EXECUTED = 1;
const SKIPPED = 0;

const TYPE_CHECKS: any = Object.freeze([
    ["isButton", "button"],
    ["isStringSelectMenu", "select"],
    ["isModalSubmit", "modal"],
    ["isContextMenuCommand", "context"],
]);

function getInteractionType(interaction: any) {
    const match = TYPE_CHECKS.find((entry: any) => interaction[entry[0]]());
    return match ? match[1] : "unknown";
}

async function replyWithError(interaction: any) {
    try {
        await replyOrEdit(interaction, ephemeralReply(HANDLER_MESSAGES.INTERACTION_ERROR));
    } catch (replyError: any) {
        logger.error("Failed to send error response:", { error: replyError.message });
    }
}

async function handlePluginError({ interaction, plugin, pluginError, guildId, userId, botCtx }: any) {
    logger.error(`Interaction plugin ${plugin.name} error (bot=${botCtx.botId} clan=${botCtx.clanId}):`, {
        error: pluginError.message,
    });

    if (guildId) {
        await insertAuditLog(guildId, userId, AUDIT_ACTIONS.ERROR_OCCURRED, {
            interaction: plugin.name,
            error: pluginError.message,
        });
    }

    await runPluginErrorHandler(plugin, interaction, pluginError, () => replyWithError(interaction));
}

async function tryExecutePlugin(interaction: any, plugin: any, userId: any, guildId: any) {
    if (!acceptsEvent(plugin, interaction)) {
        return SKIPPED;
    }

    const allowed = await enforceRateLimitForTarget(interaction, `interaction_${plugin.name}`, {
        interaction: plugin.name,
    });
    if (!allowed) {
        return SKIPPED;
    }

    await plugin.execute(interaction);

    await insertAuditLog(guildId, userId, AUDIT_ACTIONS.COMMAND_EXECUTED, {
        interaction: plugin.name,
        type: getInteractionType(interaction),
    });
    return EXECUTED;
}

async function processInteraction(interaction: any, botCtx: BotContext) {
    const userId = interaction.user.id;
    const guildId = botCtx.guildId;

    for (const plugin of interactionPlugins.values()) {
        try {
            const executed = await tryExecutePlugin(interaction, plugin, userId, guildId);
            if (executed) {
                break;
            }
        } catch (pluginError: any) {
            await handlePluginError({ interaction, plugin, pluginError, guildId, userId, botCtx });
        }
    }
}

export { processInteraction };

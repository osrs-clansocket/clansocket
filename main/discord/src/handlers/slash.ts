import path from "path";
import { fileURLToPath } from "url";
import { checkCommandPermission } from "../security/permissions.js";
import { postAuditLog as insertAuditLog } from "../core/api-client.js";
import { AUDIT_ACTIONS, HANDLER_MESSAGES } from "../core/constants.js";
import { ephemeralReply, replyOrEdit } from "./interaction-reply.js";
import { enforceRateLimitForTarget } from "./rate-limit.js";
import { createPluginRegistry, SLASH_LABELS } from "./plugin/registry.js";
import { runPluginErrorHandler } from "./plugin/error-handler.js";
import type { BotContext } from "../shared/types/bot-types.js";
import logger from "@clansocket/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const slashPlugins = new Map();
const ALLOWED = 1;
const DENIED = 0;

const { load: loadSlashPlugins, reload: reloadSlashPlugins } = createPluginRegistry(
    path.join(__dirname, "../plugins/slash"),
    slashPlugins,
    SLASH_LABELS,
);

async function auditAction(guildId: any, userId: any, action: any, data: any) {
    if (guildId) {
        await insertAuditLog(guildId, userId, action, data);
    }
}

async function checkGuildLimits({ interaction, userId, guildId, plugin, commandName }: any) {
    const allowed = await enforceRateLimitForTarget(interaction, commandName, { command: commandName });
    if (allowed === false) {
        return DENIED;
    }

    const requiredPerm = plugin.permission;
    if (requiredPerm && !(await checkCommandPermission(userId, guildId, requiredPerm))) {
        await interaction.reply(ephemeralReply(HANDLER_MESSAGES.PERMISSION_DENIED));
        await auditAction(guildId, userId, AUDIT_ACTIONS.PERMISSION_DENIED, { command: commandName });
        return DENIED;
    }
    return ALLOWED;
}

async function replyWithError(interaction: any, plugin: any, commandError: any) {
    await runPluginErrorHandler(plugin, interaction, commandError, () =>
        replyOrEdit(interaction, ephemeralReply(HANDLER_MESSAGES.COMMAND_ERROR)),
    );
}

async function handleSlashError({ commandName, guildId, userId, interaction, plugin, botCtx }: any, commandError: any) {
    logger.error(`Slash command ${commandName} error (bot=${botCtx.botId} clan=${botCtx.clanId}):`, {
        error: commandError.message,
    });
    await auditAction(guildId, userId, AUDIT_ACTIONS.ERROR_OCCURRED, {
        command: commandName,
        error: commandError.message,
    });
    await replyWithError(interaction, plugin, commandError);
}

async function processSlashCommand(interaction: any, botCtx: BotContext) {
    if (!interaction.isChatInputCommand()) {
        return;
    }
    const { commandName } = interaction;
    if (slashPlugins.has(commandName) === false) {
        return interaction.reply(ephemeralReply(HANDLER_MESSAGES.UNKNOWN_COMMAND));
    }
    const plugin = slashPlugins.get(commandName);

    const userId = interaction.user.id;
    const guildId = botCtx.guildId;
    const ctx = { commandName, guildId, userId, interaction, plugin, botCtx };

    try {
        if ((await checkGuildLimits(ctx)) === DENIED) {
            return;
        }
        await plugin.execute(interaction);
        await auditAction(guildId, userId, AUDIT_ACTIONS.COMMAND_EXECUTED, {
            command: commandName,
            options: interaction.options.data,
        });
    } catch (commandError: any) {
        await handleSlashError(ctx, commandError);
    }
}

function getSlashCommandData() {
    return [...slashPlugins.values()].filter((plugin: any) => plugin.data).map((plugin: any) => plugin.data);
}

const getLoadedPlugins = () => [...slashPlugins.keys()];

await loadSlashPlugins();

export { processSlashCommand, getSlashCommandData, reloadSlashPlugins, getLoadedPlugins };

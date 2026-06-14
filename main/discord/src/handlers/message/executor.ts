import { COMMAND_PREFIXES, AUDIT_ACTIONS, HANDLER_MESSAGES } from "../../core/constants.js";
import { checkCommandPermission } from "../../security/permissions.js";
import { postAuditLog as insertAuditLog } from "../../core/api-client.js";
import { enforceRateLimitForTarget } from "../rate-limit.js";
import { acceptsEvent } from "../plugin/filter.js";
import { runPluginErrorHandler } from "../plugin/error-handler.js";
import type { BotContext } from "../../shared/types/bot-types.js";
import logger from "@clansocket/logger";
import { messagePlugins, commandPlugins } from "./plugins.js";

const PREFIX_VALUES = Object.values(COMMAND_PREFIXES);

function parseCommand(content: any) {
    const prefix = PREFIX_VALUES.find((p: any) => content.startsWith(p));
    if (prefix === undefined) {
        return undefined;
    }
    const args = content
        .slice(prefix.length)
        .trim()
        .split(" ")
        .filter((p: any) => p.length > 0);
    const head = args.shift() as string;
    return { command: head.toLowerCase(), args, prefix };
}

async function processMessagePlugins(message: any) {
    for (const plugin of messagePlugins.values()) {
        try {
            if (acceptsEvent(plugin, message)) {
                await plugin.execute(message);
            }
        } catch (pluginError: any) {
            logger.error(`Message plugin ${plugin.name} error:`, { error: pluginError.message });
        }
    }
}

async function enforceGate(message: any, userId: any, guildId: any, plugin: any) {
    const allowed = await enforceRateLimitForTarget(message, plugin.name, { command: plugin.name }, false);
    if (allowed !== true) {
        return 0;
    }

    const requiredPerm = plugin.permission;
    if (requiredPerm) {
        const permitted = await checkCommandPermission(userId, guildId, requiredPerm);
        if (permitted === 0) {
            await message.reply(HANDLER_MESSAGES.PERMISSION_DENIED);
            await insertAuditLog(guildId, userId, AUDIT_ACTIONS.PERMISSION_DENIED, { command: plugin.name });
            return 0;
        }
    }
    return 1;
}

async function replyWithCommandError(message: any) {
    await message.reply(HANDLER_MESSAGES.COMMAND_ERROR);
}

async function processCommand(message: any, parsedCommand: any, botCtx: BotContext) {
    const { command, args } = parsedCommand;
    const plugin = commandPlugins.get(command);
    if (plugin === void 0) {
        return;
    }

    const userId = message.author.id;
    const guildId = botCtx.guildId;

    try {
        const gateResult = await enforceGate(message, userId, guildId, plugin);
        if (gateResult !== 1) {
            return;
        }
        await plugin.execute(message, args);
        await insertAuditLog(guildId, userId, AUDIT_ACTIONS.COMMAND_EXECUTED, { command, args });
    } catch (commandError: any) {
        logger.error(`Command ${command} error (bot=${botCtx.botId} clan=${botCtx.clanId}):`, {
            error: commandError.message,
        });
        await insertAuditLog(guildId, userId, AUDIT_ACTIONS.ERROR_OCCURRED, { command, error: commandError.message });
        await runPluginErrorHandler(plugin, message, commandError, () => replyWithCommandError(message));
    }
}

async function processMessage(message: any, botCtx: BotContext) {
    if (message.author.bot || !message.guild) {
        return;
    }
    await processMessagePlugins(message);
    const parsedCommand = parseCommand(message.content);
    if (parsedCommand) {
        await processCommand(message, parsedCommand, botCtx);
    }
}

export { processMessage };

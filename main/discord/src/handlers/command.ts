import * as messageHandler from "./message/index.js";
import * as slashHandler from "./slash.js";
import * as interactionHandler from "./interaction/index.js";
import { logUserJoin, logUserLeave, logServerAdd, logServerRemove } from "./audit.js";
import { dispatchEvent, eventErrCtx } from "../dispatchers/event-dispatcher.js";
import { trackInteractionPending, triggerInteractionCleanup } from "../interactions/ttl-tracker.js";
import { serverRegistry } from "../registries/server-registry.js";
import type { BotIdentity } from "../shared/types/bot-types.js";
import logger from "@clansocket/logger";

const handlers = {
    message: messageHandler,
    slash: slashHandler,
    interaction: interactionHandler,
};

function safeHandler(fn: any, label: any) {
    return async (arg: any) => {
        try {
            await fn(arg);
        } catch (err: any) {
            logger.error(`${label} error:`, err);
        }
    };
}

const handleMemberAdd = safeHandler((member: any) => logUserJoin(member.guild.id, member.user.id), "Guild member add");
const handleMemberRemove = safeHandler(
    (member: any) => logUserLeave(member.guild.id, member.user.id),
    "Guild member remove",
);

const handleGuildChange = (logFn: any, infoFn: any) =>
    safeHandler(async (guild: any) => {
        await logFn(guild.id);
        serverRegistry.invalidate(guild.id);
        infoFn(guild);
    }, "Guild event");

const handleGuildCreate = handleGuildChange(logServerAdd, (g: any) =>
    logger.info(`Joined server: ${g.name} (${g.memberCount} members)`),
);
const handleGuildDelete = handleGuildChange(logServerRemove, (g: any) => logger.info(`Left server: ${g.name}`));

function onInteractionCreate(intr: any, identity: BotIdentity) {
    trackInteractionPending(intr).catch(() => undefined);
    triggerInteractionCleanup().catch(() => undefined);
    return dispatchEvent(intr, identity, {
        label: "Interaction",
        process: async (i, ctx) => {
            if (i.isChatInputCommand()) {
                await handlers.slash.processSlashCommand(i, ctx);
            } else {
                await handlers.interaction.processInteraction(i, ctx);
            }
        },
        errCtx: (ctx, i) => eventErrCtx(ctx, i.user?.id, "interactionId", i.id),
    });
}

function registerEventHandlers(client: any, identity: BotIdentity) {
    client.on("messageCreate", (m: any) =>
        dispatchEvent(m, identity, {
            label: "Message",
            process: (msg, ctx) => handlers.message.processMessage(msg, ctx),
            errCtx: (ctx, msg) => eventErrCtx(ctx, msg.author?.id, "messageId", msg.id),
        }),
    );
    client.on("interactionCreate", (i: any) => onInteractionCreate(i, identity));
    client.on("guildMemberAdd", handleMemberAdd);
    client.on("guildMemberRemove", handleMemberRemove);
    client.on("guildCreate", handleGuildCreate);
    client.on("guildDelete", handleGuildDelete);
}

async function reloadAllPlugins() {
    await handlers.message.reloadPlugins();
    await handlers.slash.reloadSlashPlugins();
    await handlers.interaction.reloadInteractionPlugins();
}

function getLoadedPlugins() {
    return {
        ...handlers.message.getLoadedPlugins(),
        slash: handlers.slash.getLoadedPlugins(),
        interactions: handlers.interaction.getLoadedPlugins(),
    };
}

export { registerEventHandlers, reloadAllPlugins, getLoadedPlugins };

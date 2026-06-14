import { postAuditLog } from "../core/api-client.js";
import { LOG_LEVELS, AUDIT_ACTIONS } from "../core/constants.js";
import logger from "@clansocket/logger";

function who(guildId: any, userId: any) {
    return { guildId, userId };
}

async function emit(level: any, action: any, ctx: any, data: any = {}) {
    const message = `${action}: ${ctx.guildId}${ctx.userId ? `:${ctx.userId}` : ""}`;
    logger.write(level, message, data);
    if (ctx.guildId && level !== LOG_LEVELS.DEBUG) {
        await postAuditLog(ctx.guildId, ctx.userId, action, data);
    }
}

async function logCommandExecution({ guildId, userId, command, args, success = true }: any) {
    const action = success ? AUDIT_ACTIONS.COMMAND_EXECUTED : AUDIT_ACTIONS.ERROR_OCCURRED;
    const level = success ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR;
    await emit(level, action, who(guildId, userId), { command, args });
}

async function logPermissionDenied(guildId: any, userId: any, command: any, requiredPermission: any) {
    await emit(LOG_LEVELS.WARN, AUDIT_ACTIONS.PERMISSION_DENIED, who(guildId, userId), { command, requiredPermission });
}

async function logRateLimit(guildId: any, userId: any, command: any) {
    await emit(LOG_LEVELS.WARN, AUDIT_ACTIONS.RATE_LIMITED, who(guildId, userId), { command });
}

async function logError(err: any, ctx: any = {}) {
    await emit(LOG_LEVELS.ERROR, AUDIT_ACTIONS.ERROR_OCCURRED, who(ctx.guildId, ctx.userId), {
        error: err.message,
        stack: err.stack,
        context: ctx,
    });
}

function createInfoLogger(action: any) {
    return (guildId: any, userId: any) => emit(LOG_LEVELS.INFO, action, who(guildId, userId));
}

const logUserJoin = createInfoLogger(AUDIT_ACTIONS.USER_JOINED);
const logUserLeave = createInfoLogger(AUDIT_ACTIONS.USER_LEFT);
const logServerAdd = createInfoLogger(AUDIT_ACTIONS.SERVER_ADDED);
const logServerRemove = createInfoLogger(AUDIT_ACTIONS.SERVER_REMOVED);

export {
    logCommandExecution,
    logPermissionDenied,
    logRateLimit,
    logError,
    logUserJoin,
    logUserLeave,
    logServerAdd,
    logServerRemove,
};

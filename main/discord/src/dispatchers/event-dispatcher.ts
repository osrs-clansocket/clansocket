import logger from "@clansocket/logger";
import { logError } from "../handlers/audit.js";
import { resolveBotContext } from "../resolvers/bot-context-resolver.js";
import type { BotContext, BotIdentity } from "../shared/types/bot-types.js";

interface DispatchOptions<T> {
    label: string;
    process: (event: T, botCtx: BotContext) => Promise<void>;
    errCtx: (botCtx: BotContext, event: T) => Record<string, unknown>;
}

export async function dispatchEvent<T extends { guild?: { id?: string } }>(
    event: T,
    identity: BotIdentity,
    opts: DispatchOptions<T>,
): Promise<void> {
    const guildId = event.guild?.id;
    const botCtx = guildId ? await resolveBotContext(identity, guildId) : null;
    if (botCtx) {
        try {
            await opts.process(event, botCtx);
        } catch (err: any) {
            logger.error(`${opts.label} processing error:`, err);
            await logError(err, opts.errCtx(botCtx, event));
        }
    }
}

export function eventErrCtx(
    botCtx: BotContext,
    userId: string | undefined,
    idField: string,
    idValue: string | undefined,
): Record<string, unknown> {
    return { guildId: botCtx.guildId, userId, [idField]: idValue };
}

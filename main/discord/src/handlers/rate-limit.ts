import { checkRateLimit } from "../security/ratelimit.js";
import { postAuditLog as insertAuditLog } from "../core/api-client.js";
import { AUDIT_ACTIONS, HANDLER_MESSAGES, MS_PER_SECOND } from "../core/constants.js";
import { ephemeralReply, makeReplySender } from "./interaction-reply.js";

function rateLimitMessage(resetIn: any) {
    return (
        HANDLER_MESSAGES.RATE_LIMITED_PREFIX + Math.ceil(resetIn / MS_PER_SECOND) + HANDLER_MESSAGES.RATE_LIMITED_SUFFIX
    );
}

async function enforceRateLimit({ userId, guildId, key, audit, replyWith }: any) {
    const rateLimit: any = await checkRateLimit(userId, guildId, key);
    if (rateLimit.allowed) {
        return true;
    }
    await replyWith(rateLimitMessage(rateLimit.resetIn));
    await insertAuditLog(guildId, userId, AUDIT_ACTIONS.RATE_LIMITED, audit);
    return false;
}

async function enforceRateLimitForTarget(
    target: any,
    key: any,
    audit: any,
    ephemeral: boolean = true,
): Promise<boolean> {
    return enforceRateLimit({
        userId: target.user?.id ?? target.author?.id,
        guildId: target.guild?.id,
        key,
        audit,
        replyWith: makeReplySender(target, ephemeral ? ephemeralReply : undefined),
    });
}

export { rateLimitMessage, enforceRateLimit, enforceRateLimitForTarget };

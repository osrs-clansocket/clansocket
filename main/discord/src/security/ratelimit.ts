import config from "../core/config.js";
import { checkRateLimit as fetchLimit, setRateLimit as pushLimit } from "../core/api-client.js";
import logger from "@clansocket/logger";

const { rateLimitMaxRequests: maxRequests, rateLimitWindow } = config.security;
const DEFAULT_COMMAND = "global";
const ZERO = 0;

function createIdentifier(userId: any, guildId: any, command: any) {
    return `${guildId}:${userId}:${command}`;
}

function buildResult(count: any, resetTime: any, now: any) {
    return {
        count,
        remaining: Math.max(ZERO, maxRequests - count),
        resetTime,
        resetIn: resetTime ? Math.max(ZERO, resetTime - now) : ZERO,
    };
}

async function checkRateLimit(userId: any, guildId: any, command: any = DEFAULT_COMMAND) {
    try {
        const identifier = createIdentifier(userId, guildId, command);
        const now = Date.now();
        const existing: any = await fetchLimit(identifier);
        const isNew = !existing || now >= existing.reset_time;

        if (isNew) {
            await pushLimit(identifier, 1, now + rateLimitWindow);
            return { allowed: 1, remaining: maxRequests - 1 };
        }

        if (existing.count >= maxRequests) {
            return { allowed: ZERO, ...buildResult(existing.count, existing.reset_time, now) };
        }

        const newCount = existing.count + 1;
        await pushLimit(identifier, newCount, existing.reset_time);
        return { allowed: 1, remaining: maxRequests - newCount };
    } catch (rateLimitError: any) {
        logger.error("Error checking rate limit:", { error: rateLimitError.message });
        return { allowed: 1, remaining: maxRequests };
    }
}

async function getRemainingTime(userId: any, guildId: any, command: any = DEFAULT_COMMAND) {
    try {
        const identifier = createIdentifier(userId, guildId, command);
        const existing: any = await fetchLimit(identifier);
        return existing ? Math.max(ZERO, existing.reset_time - Date.now()) : ZERO;
    } catch (timeError: any) {
        logger.error("Error getting remaining time:", { error: timeError.message });
        return ZERO;
    }
}

async function resetUserRateLimit(userId: any, guildId: any, command: any = DEFAULT_COMMAND) {
    try {
        const identifier = createIdentifier(userId, guildId, command);
        await pushLimit(identifier, ZERO, Date.now());
        return 1;
    } catch (resetError: any) {
        logger.error("Error resetting rate limit:", { error: resetError.message });
        return ZERO;
    }
}

async function getUserRateLimitInfo(userId: any, guildId: any, command: any = DEFAULT_COMMAND) {
    try {
        const identifier = createIdentifier(userId, guildId, command);
        const existing: any = await fetchLimit(identifier);
        const now = Date.now();
        return existing ? buildResult(existing.count, existing.reset_time, now) : buildResult(ZERO, undefined, now);
    } catch (infoError: any) {
        logger.error("Error getting rate limit info:", { error: infoError.message });
        return buildResult(ZERO, undefined, Date.now());
    }
}

export { checkRateLimit, getRemainingTime, resetUserRateLimit, getUserRateLimitInfo };

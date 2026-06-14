import logger from "@clansocket/logger";
import { apiGet, apiRequest } from "../fetchers/api-fetcher.js";

interface PermissionsResponse {
    permissions?: string[];
}

interface RateLimitResponse {
    count?: number;
    reset_time?: number;
}

interface VarezAskResponse {
    message?: string;
    mentions?: string[];
}

async function postAuditLog(guildId: string, userId: string, action: string, data: object = {}): Promise<void> {
    try {
        await apiRequest<unknown>("POST", "/api/discord/audit", { guildId, userId, action, data });
    } catch (err: any) {
        logger.error("Failed to post audit log:", err);
    }
}

async function checkRateLimit(identifier: string): Promise<RateLimitResponse | null> {
    try {
        return await apiRequest<RateLimitResponse>("POST", "/api/discord/rate-limit/check", { identifier });
    } catch (err: any) {
        logger.error("Rate limit check failed:", err);
        return null;
    }
}

async function setRateLimit(identifier: string, count: number, reset_time: number): Promise<void> {
    try {
        await apiRequest<unknown>("POST", "/api/discord/rate-limit/set", { identifier, count, reset_time });
    } catch (err: any) {
        logger.error("Rate limit set failed:", err);
    }
}

async function getUserPermissions(userId: string, guildId: string): Promise<string[]> {
    try {
        const res = await apiGet<PermissionsResponse>(`/api/discord/permissions/${guildId}/${userId}`);
        return Array.isArray(res?.permissions) ? res.permissions : [];
    } catch (err: any) {
        logger.error("Get permissions failed:", err);
        return [];
    }
}

async function setUserPermissions(userId: string, guildId: string, permissions: string[]): Promise<boolean> {
    try {
        await apiRequest<unknown>("PUT", `/api/discord/permissions/${guildId}/${userId}`, { permissions });
        return true;
    } catch (err: any) {
        logger.error("Set permissions failed:", err);
        return false;
    }
}

async function askVarezAi(
    text: string,
    channelContext: object,
    author: object | null,
    mode: string | null,
): Promise<{ message: string; mentions: string[] }> {
    try {
        const body: Record<string, unknown> = { text, channelContext };
        if (author) body.author = author;
        if (mode) body.mode = mode;
        const res = await apiRequest<VarezAskResponse>("POST", "/api/discord/ai/ask", body);
        return { message: res?.message ?? "", mentions: Array.isArray(res?.mentions) ? res.mentions : [] };
    } catch (err: any) {
        logger.error("Varez AI ask failed:", err);
        return { message: "", mentions: [] };
    }
}

export { postAuditLog, checkRateLimit, setRateLimit, getUserPermissions, setUserPermissions, askVarezAi };

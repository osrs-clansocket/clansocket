import type { DiscordBotPayload } from "../types/byo-bot-types.js";

function isNonEmptyString(v: unknown): v is string {
    return typeof v === "string" && v.length > 0;
}

export function validateDiscordBotPayload(payload: unknown): payload is DiscordBotPayload {
    if (typeof payload !== "object" || payload === null) return false;
    const p = payload as Record<string, unknown>;
    if (!isNonEmptyString(p.bot_token)) return false;
    if (!isNonEmptyString(p.application_id)) return false;
    if (p.public_key !== undefined && !isNonEmptyString(p.public_key)) return false;
    return true;
}

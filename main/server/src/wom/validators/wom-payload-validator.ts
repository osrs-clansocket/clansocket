import type { WomPayload } from "../types/wom-types.js";

const MIN_UA_LENGTH = 2;
const MAX_UA_LENGTH = 64;
const ASCII_DIGIT_MIN = 48;
const ASCII_DIGIT_MAX = 57;
const ASCII_UPPER_MIN = 65;
const ASCII_UPPER_MAX = 90;
const ASCII_LOWER_MIN = 97;
const ASCII_LOWER_MAX = 122;

function isNonEmptyString(v: unknown): v is string {
    return typeof v === "string" && v.length > 0;
}

function isPositiveInteger(v: unknown): v is number {
    return typeof v === "number" && Number.isInteger(v) && v > 0;
}

function isAllowedUserAgentChar(ch: string): boolean {
    const code = ch.charCodeAt(0);
    if (code >= ASCII_DIGIT_MIN && code <= ASCII_DIGIT_MAX) return true;
    if (code >= ASCII_UPPER_MIN && code <= ASCII_UPPER_MAX) return true;
    if (code >= ASCII_LOWER_MIN && code <= ASCII_LOWER_MAX) return true;
    return ch === "_" || ch === "-" || ch === "#" || ch === "@" || ch === ".";
}

function isValidUserAgent(v: unknown): v is string {
    if (typeof v !== "string") return false;
    if (v.length < MIN_UA_LENGTH || v.length > MAX_UA_LENGTH) return false;
    for (const ch of v) {
        if (!isAllowedUserAgentChar(ch)) return false;
    }
    return true;
}

export function validateWomPayload(payload: unknown): payload is WomPayload {
    if (typeof payload !== "object" || payload === null) return false;
    const p = payload as Record<string, unknown>;
    if (!isPositiveInteger(p.group_id)) return false;
    if (!isNonEmptyString(p.verification_code)) return false;
    if (p.api_key !== undefined && !isNonEmptyString(p.api_key)) return false;
    if (!isValidUserAgent(p.user_agent)) return false;
    return true;
}

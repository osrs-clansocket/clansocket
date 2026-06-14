import { normalizeActions } from "./actions.js";
import { clampPollSeconds, normalizeQuery, type DbQuery, type ParsedResponse } from "./types.js";

export type { DbQuery, ParsedResponse } from "./types.js";

function extractJson(text: string): string | null {
    const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenced) return fenced[1].trim();

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) return text.slice(start, end + 1);

    return null;
}

function normalizeSuggestedUserResponse(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function fallback(text: string): ParsedResponse {
    return {
        actions: null,
        message: text,
        status: null,
        suggested_user_response: null,
        next_context: [],
        chain: false,
        read: [],
        query: [],
        pin: [],
        unpin: [],
        profile_context: null,
        memory: null,
        recap: null,
        next_poll_seconds: null,
    };
}

export function parseResponse(text: string): ParsedResponse {
    const raw = extractJson(text);
    if (!raw) return fallback(text);

    try {
        const json = JSON.parse(raw);
        return {
            actions: normalizeActions(json.actions),
            message: json.message ?? null,
            status: json.status ?? null,
            suggested_user_response: normalizeSuggestedUserResponse(json.suggested_user_response),
            next_context: json.next_context ?? [],
            chain: json.chain === true,
            read: Array.isArray(json.read) ? json.read : [],
            query: Array.isArray(json.query)
                ? (json.query as unknown[]).map(normalizeQuery).filter((q): q is DbQuery => q !== null)
                : [],
            pin: Array.isArray(json.pin) ? json.pin : [],
            unpin: Array.isArray(json.unpin) ? json.unpin : [],
            profile_context: json.profile_context ?? null,
            memory: Array.isArray(json.memory) ? json.memory : null,
            recap: json.recap && typeof json.recap === "object" ? json.recap : null,
            next_poll_seconds: clampPollSeconds(json.next_poll_seconds),
        };
    } catch {
        return fallback(text);
    }
}

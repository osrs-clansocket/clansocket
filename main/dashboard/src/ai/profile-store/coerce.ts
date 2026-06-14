import type { SessionEntry } from "./types.js";

function asObject(raw: unknown): Record<string, unknown> | null {
    return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
}

function asString(v: unknown): string | null {
    return typeof v === "string" ? v : null;
}

function copyIfString<K extends string>(target: Record<string, unknown>, src: Record<string, unknown>, key: K): void {
    const s = asString(src[key]);
    if (s !== null) target[key] = s;
}

export function coerceIdentityDelta(raw: unknown): Record<string, string | null> | null {
    const obj = asObject(raw);
    if (!obj) return null;
    const out: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(obj)) {
        const s = asString(v);
        if (s !== null) out[k] = s;
        else if (v === null) out[k] = null;
    }
    return out;
}

export function coerceSessionEntry(raw: unknown): Omit<SessionEntry, "turn"> | null {
    const r = asObject(raw);
    if (!r) return null;
    const they = asString(r.they);
    const i = asString(r.i);
    if (!they || !i) return null;
    const entry: Omit<SessionEntry, "turn"> = { they, i };
    const optional = entry as Record<string, unknown>;
    copyIfString(optional, r, "learned");
    copyIfString(optional, r, "fix");
    copyIfString(optional, r, "failure");
    return entry;
}

export function coerceFocus(raw: unknown): string | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    return typeof raw === "string" ? raw : undefined;
}

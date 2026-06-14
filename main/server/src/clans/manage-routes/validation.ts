import type { ClientAuditEntry } from "../../database/index.js";
import { asFiniteNumber, asObject, asString } from "../../shared/coerce.js";

export const MAX_BATCH_ENTRIES = 50;
export const MAX_ENTRY_FIELD_LENGTH = 256;
export const MAX_META_JSON_LENGTH = 4096;
const MAX_PARAM_LENGTH = 64;

export function parseIntParam(value: unknown, fallback: number): number {
    const s = asString(value);
    if (s === null) return fallback;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : fallback;
}

function boundedString(value: unknown, maxLen: number): string | undefined {
    const s = asString(value);
    if (s === null || s.length === 0 || s.length > maxLen) return undefined;
    return s;
}

export function readKindPrefix(value: unknown): string | undefined {
    return boundedString(value, MAX_PARAM_LENGTH);
}

export function readActorParam(value: unknown): string | undefined {
    return boundedString(value, MAX_PARAM_LENGTH);
}

function readSessionId(raw: unknown): string | null {
    const s = asString(raw);
    return s !== null && s.length > 0 && s.length <= MAX_PARAM_LENGTH ? s : null;
}

function readSeq(raw: unknown): number | null {
    const n = asFiniteNumber(raw);
    return n !== null && Number.isInteger(n) && n >= 0 ? n : null;
}

function readAction(raw: unknown): string | null {
    return boundedString(raw, MAX_ENTRY_FIELD_LENGTH) ?? null;
}

function readTarget(raw: unknown): string | null {
    return boundedString(raw, MAX_ENTRY_FIELD_LENGTH) ?? null;
}

function readMeta(raw: unknown): Record<string, unknown> | null | false {
    if (raw === undefined || raw === null) return null;
    const obj = asObject(raw);
    if (obj === null || Array.isArray(raw)) return null;
    const serialized = JSON.stringify(obj);
    if (serialized.length > MAX_META_JSON_LENGTH) return false;
    return obj;
}

export function validateClientEntry(raw: unknown): ClientAuditEntry | null {
    const e = asObject(raw);
    if (e === null) return null;
    const sessionId = readSessionId(e.sessionId);
    if (sessionId === null) return null;
    const seq = readSeq(e.seq);
    if (seq === null) return null;
    const ts = asFiniteNumber(e.ts);
    if (ts === null) return null;
    const action = readAction(e.action);
    if (action === null) return null;
    const meta = readMeta(e.meta);
    if (meta === false) return null;
    const out: ClientAuditEntry = { sessionId, seq, ts, action, target: readTarget(e.target), meta };
    if (e.actor_kind === "ai") out.actor_kind = "ai";
    return out;
}

import type { HistoryEntry, ProfileContext } from "../../chain/chain-state-store.js";
import { asArray, asFiniteNumber, asObject, asString, copyIfString, nonEmptyString } from "../../../shared/coerce.js";
import { SLOT_REGISTRY } from "../../persona/default-persona/preferences/slot-registry.js";
import type { ActionResultBody, SendKind } from "./feedback.js";

const SEND_MAX_TOKENS_DEFAULT = 4096;
const SEND_MAX_TOKENS_CEILING = 32000;
const SEND_MAX_TOKENS_FLOOR = 1;

const MAX_HISTORY_CHARS = 12000;
const HISTORY_HEAD_CHARS = 300;
const HISTORY_TAIL_BUDGET = 400;

const PROSE_OVERRIDE_MAX_CHARS = 8192;

const SLOT_BY_KEY = new Map(SLOT_REGISTRY.map((s) => [s.key, s]));

export interface SendBody {
    text?: string;
    mode?: string;
    pageState?: Record<string, unknown> | null;
    chainMode?: string;
    kind?: SendKind;
    actionResults?: ActionResultBody[];
    priorChainId?: string;
    history?: HistoryEntry[];
    profile?: ProfileContext | null;
    personaOverrides?: Record<string, unknown> | null;
    modeOverrides?: Record<string, unknown> | null;
    lastTurn?: { raw?: unknown; userMessage?: unknown } | null;
    apiKey?: string;
    provider?: string;
    model?: string;
    maxTokens?: number;
}

const KNOWN_MODE_KEYS: ReadonlySet<string> = new Set([
    "mode_continuous",
    "mode_dashboard_actions",
    "mode_db_queries",
    "mode_memory_authoring",
    "mode_pin_unpin",
    "mode_profile_updates",
    "mode_suggested_replies",
    "mode_banter",
    "mode_inside_jokes",
    "mode_spontaneous_reactions",
    "mode_op_action",
    "mode_op_guide",
    "mode_op_tracker",
]);

export function normalizeModeOverrides(raw: unknown): Record<string, boolean> {
    const r = asObject(raw);
    if (r === null) return {};
    const out: Record<string, boolean> = {};
    for (const [key, val] of Object.entries(r)) {
        if (!KNOWN_MODE_KEYS.has(key)) continue;
        if (typeof val === "boolean") out[key] = val;
    }
    return out;
}

export function formatHistoryTimestamp(timestamp: number | undefined): string {
    if (timestamp === undefined || !Number.isFinite(timestamp)) return "no-ts";
    return new Date(timestamp).toISOString().replace("T", " ").replace(".000Z", "Z");
}

function truncateHistoryBlock(out: string): string {
    if (out.length <= MAX_HISTORY_CHARS) return out;
    const head = out.slice(0, HISTORY_HEAD_CHARS);
    const tail = out.slice(-(MAX_HISTORY_CHARS - HISTORY_TAIL_BUDGET));
    return `${head}\n\n[... truncated ${out.length - MAX_HISTORY_CHARS} chars from the middle ...]\n\n${tail}`;
}

const MESSAGES_PER_TURN = 2;

export function formatClientHistory(
    entries: { role: "user" | "assistant"; content: string; timestamp?: number }[],
    windowTurns?: number,
): string {
    if (entries.length === 0) return "No chat history — this is the first turn, or the user cleared it.";
    const sliced = windowTurns !== undefined ? entries.slice(-windowTurns * MESSAGES_PER_TURN) : entries;
    const lines: string[] = [`[CHAT HISTORY — last ${sliced.length} messages, newest last. Timestamps are UTC.]`];
    for (let i = 0; i < sliced.length; i++) {
        const m = sliced[i]!;
        lines.push(`[turn ${i + 1}] [${formatHistoryTimestamp(m.timestamp)}] ${m.role}: ${m.content}`);
    }
    return truncateHistoryBlock(lines.join("\n"));
}

function normalizeTimestamp(raw: unknown): number | undefined {
    const n = asFiniteNumber(raw);
    if (n !== null) return n;
    const s = asString(raw);
    if (s !== null) {
        const parsed = Date.parse(s);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

function readHistoryEntry(raw: unknown): HistoryEntry | null {
    const e = asObject(raw);
    if (e === null) return null;
    const role = e.role;
    if (role !== "user" && role !== "assistant") return null;
    const content = asString(e.content);
    if (content === null) return null;
    return { role, content, timestamp: normalizeTimestamp(e.timestamp) };
}

export function normalizeHistory(raw: unknown): HistoryEntry[] {
    const arr = asArray(raw);
    if (arr === null) return [];
    const out: HistoryEntry[] = [];
    for (const item of arr) {
        const entry = readHistoryEntry(item);
        if (entry !== null) out.push(entry);
    }
    return out;
}

function readSessionEntry(raw: unknown): ProfileContext["session"][number] | null {
    const e = asObject(raw);
    if (e === null) return null;
    const turn = asFiniteNumber(e.turn);
    const they = asString(e.they);
    const i = asString(e.i);
    if (turn === null || they === null || i === null) return null;
    const out: ProfileContext["session"][number] = { turn, they, i };
    const target = out as unknown as Record<string, unknown>;
    copyIfString(target, e, "learned");
    copyIfString(target, e, "fix");
    copyIfString(target, e, "failure");
    return out;
}

export function normalizeProfile(raw: unknown): ProfileContext | null {
    const r = asObject(raw);
    if (r === null) return null;
    const identity: Record<string, string> = {};
    const identityRaw = asObject(r.identity);
    if (identityRaw)
        for (const [k, v] of Object.entries(identityRaw)) {
            const s = asString(v);
            if (s !== null) identity[k] = s;
        }
    const session: ProfileContext["session"] = [];
    const sessionRaw = asArray(r.session);
    if (sessionRaw)
        for (const entry of sessionRaw) {
            const e = readSessionEntry(entry);
            if (e !== null) session.push(e);
        }
    return { identity, session, focus: asString(r.focus) };
}

export function validateSendBody(body: SendBody): string | null {
    if (nonEmptyString(body.text) === null) return "text required";
    if (nonEmptyString(body.mode) === null) return "mode required";
    if (nonEmptyString(body.apiKey) === null) return "apiKey required";
    if (nonEmptyString(body.provider) === null) return "provider required";
    if (body.maxTokens !== undefined) {
        if (asFiniteNumber(body.maxTokens) === null) return "maxTokens must be a number";
        if (body.maxTokens < SEND_MAX_TOKENS_FLOOR) return `maxTokens must be at least ${SEND_MAX_TOKENS_FLOOR}`;
        if (body.maxTokens > SEND_MAX_TOKENS_CEILING) return `maxTokens must be at most ${SEND_MAX_TOKENS_CEILING}`;
    }
    return null;
}

export function resolveMaxTokens(requested: number | undefined): number {
    if (requested === undefined) return SEND_MAX_TOKENS_DEFAULT;
    return Math.floor(requested);
}

function normalizeNumberOverride(meta: (typeof SLOT_REGISTRY)[number], raw: string): string | null {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return null;
    const min = meta.bounds?.min ?? Number.NEGATIVE_INFINITY;
    const max = meta.bounds?.max ?? Number.POSITIVE_INFINITY;
    if (n < min || n > max) return null;
    return String(n);
}

export function normalizePersonaOverrides(raw: unknown): Record<string, string> {
    const r = asObject(raw);
    if (r === null) return {};
    const out: Record<string, string> = {};
    for (const [key, val] of Object.entries(r)) {
        const meta = SLOT_BY_KEY.get(key);
        if (!meta) continue;
        const s = asString(val);
        if (s === null || s === "") continue;
        if (meta.type === "number") {
            const coerced = normalizeNumberOverride(meta, s);
            if (coerced !== null) out[key] = coerced;
        } else if (s.length <= PROSE_OVERRIDE_MAX_CHARS) {
            out[key] = s;
        }
    }
    return out;
}

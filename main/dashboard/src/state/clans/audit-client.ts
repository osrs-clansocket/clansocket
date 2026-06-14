import { events } from "../../managers/events.js";
import { setCausalCorrelationId } from "../identity/identity-client/index.js";
import { sameOriginFetch } from "../../shared/helpers/fetch-helper.js";

const MAX_BATCH = 50;
const MAX_AGE_MS = 5000;
const COLLAPSE_MS = 1000;
const CLAN_PATH_PREFIX = "/clans/";
const CAUSAL_ACTIONS = new Set<string>(["client:click", "client:submit"]);

interface BufferEntry {
    sessionId: string;
    seq: number;
    ts: number;
    action: string;
    target: string | null;
    meta: Record<string, unknown> | null;
    actor_kind?: "ai";
}

const sessionId = crypto.randomUUID();
let seq = 0;
const buffer: BufferEntry[] = [];
let currentSlug: string | null = parseSlug(window.location.pathname);
let started = false;

function parseSlug(pathname: string): string | null {
    if (!pathname.startsWith(CLAN_PATH_PREFIX)) return null;
    const rest = pathname.slice(CLAN_PATH_PREFIX.length);
    const i = rest.indexOf("/");
    const slug = i === -1 ? rest : rest.slice(0, i);
    return slug.length > 0 ? slug : null;
}

function push(
    action: string,
    target: string | null,
    meta: Record<string, unknown> | null = null,
    actorKind?: "ai",
): void {
    if (currentSlug === null) return;
    const last = buffer[buffer.length - 1];
    if (
        last &&
        last.action === action &&
        last.target === target &&
        last.actor_kind === actorKind &&
        Date.now() - last.ts < COLLAPSE_MS
    ) {
        const prevCount = typeof last.meta?.count === "number" ? last.meta.count : 1;
        last.meta = { ...(last.meta ?? {}), count: prevCount + 1 };
        if (CAUSAL_ACTIONS.has(action)) setCausalCorrelationId(`${sessionId}.${last.seq}`);
        return;
    }
    const entry: BufferEntry = { sessionId, seq: seq++, ts: Date.now(), action, target, meta };
    if (actorKind) entry.actor_kind = actorKind;
    buffer.push(entry);
    if (CAUSAL_ACTIONS.has(action)) setCausalCorrelationId(`${sessionId}.${entry.seq}`);
    if (buffer.length >= MAX_BATCH) {
        void flush();
        return;
    }
    if (Date.now() - buffer[0]!.ts >= MAX_AGE_MS) {
        void flush();
    }
}

function batchUrl(slug: string): string {
    return `/api/clans/${encodeURIComponent(slug)}/manage/audit/batch`;
}

async function flush(slugOverride?: string | null): Promise<void> {
    if (buffer.length === 0) return;
    const slug = slugOverride !== undefined ? slugOverride : currentSlug;
    if (slug === null) return;
    const entries = buffer.splice(0);
    try {
        await sameOriginFetch(batchUrl(slug), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries }),
        });
    } catch {
        return;
    }
}

function flushBeacon(): void {
    if (buffer.length === 0 || currentSlug === null) return;
    const data = JSON.stringify({ entries: buffer.splice(0) });
    const blob = new Blob([data], { type: "application/json" });
    navigator.sendBeacon(batchUrl(currentSlug), blob);
}

function onRouteChange(...args: unknown[]): void {
    const path = typeof args[0] === "string" ? args[0] : window.location.pathname;
    const previousSlug = currentSlug;
    void flush(previousSlug);
    currentSlug = parseSlug(path);
    if (currentSlug !== null) {
        push("client:route", path);
    }
}

export function startAuditClient(): void {
    if (started) return;
    started = true;
    events.on("route:change", onRouteChange);
    window.addEventListener("beforeunload", flushBeacon);
    window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flushBeacon();
    });
}

export function recordClientClick(target: string, label?: string): void {
    push("client:click", target, label !== undefined ? { label } : null);
}

export function recordClientSubmit(target: string, meta: { fields: string[]; rsn?: string; label?: string }): void {
    push("client:submit", target, meta);
}

export interface AiActionAuditMeta {
    chainId?: string;
    args?: Record<string, unknown>;
    success?: boolean;
    error?: string;
}

export function recordAiAction(verb: string, target: string | null, meta: AiActionAuditMeta = {}): void {
    push(`ai:${verb}`, target, meta as Record<string, unknown>, "ai");
}

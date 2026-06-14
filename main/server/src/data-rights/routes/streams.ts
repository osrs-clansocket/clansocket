import { Router, type Request, type Response } from "express";
import { HTTP_BAD_REQUEST } from "../../shared/http/http-status.js";
import { subscribeProjection } from "../streams/projection.js";
import { resolveTopic } from "../streams/projection-registry.js";
import "../streams/projection-topics.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { subscribeIdentityStream } from "../streams/identity-stream.js";
import {
    scopeKeyForClan,
    scopeKeyForClanAudit,
    scopeKeyForPlugin,
    subscribeDbWrites,
} from "../streams/writes-stream.js";
import { canUserSeeScopeKey, listUserScopes, scopeFromScopeKey, tableHasUserRows } from "../scopes/scopes/index.js";
import {
    SCOPE_APP,
    SCOPE_CLAN,
    SCOPE_CLAN_AUDIT,
    SCOPE_PLUGIN,
    SCOPE_VAREZ,
    type Scope,
} from "../scopes/user-scope/index.js";

const SIMPLE_SCOPE_KINDS = new Set<string>([SCOPE_APP, SCOPE_VAREZ]);

const router = Router();

function openEventStream(res: Response): void {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.write(": stream open\n\n");
}

function writeSseEvent(res: Response, payload: unknown, unsubscribe: () => void): void {
    try {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
        unsubscribe();
    }
}

function bindStreamLifecycle(req: Request, unsubscribe: () => void): void {
    req.on("close", () => unsubscribe());
    req.on("error", () => unsubscribe());
}

function buildWritesScopeMap(siteAccountId: string): Map<string, Scope> {
    const scopes = listUserScopes(siteAccountId);
    const out = new Map<string, Scope>();
    for (const s of scopes) {
        if (SIMPLE_SCOPE_KINDS.has(s.kind)) {
            out.set(s.kind, { kind: s.kind } as Scope);
        } else if (s.kind === SCOPE_CLAN && s.clanId) {
            out.set(scopeKeyForClan(s.clanId), { kind: SCOPE_CLAN, clanId: s.clanId });
        } else if (s.kind === SCOPE_CLAN_AUDIT && s.clanId) {
            out.set(scopeKeyForClanAudit(s.clanId), { kind: SCOPE_CLAN_AUDIT, clanId: s.clanId });
        } else if (s.kind === SCOPE_PLUGIN && s.clanId && s.mode) {
            out.set(scopeKeyForPlugin(s.clanId, s.mode), { kind: SCOPE_PLUGIN, clanId: s.clanId, mode: s.mode });
        }
    }
    return out;
}

interface ParsedSub {
    readonly id: string;
    readonly kind: "projection" | "writes" | "identification";
    readonly raw: Record<string, unknown>;
}

function parseSubs(input: unknown): { ok: true; subs: ParsedSub[] } | { ok: false; error: string; field?: string } {
    if (!Array.isArray(input)) return { ok: false, error: "bad_subs_shape" };
    const subs: ParsedSub[] = [];
    for (const raw of input) {
        if (raw === null || typeof raw !== "object") return { ok: false, error: "bad_sub_entry" };
        const entry = raw as Record<string, unknown>;
        if (typeof entry.id !== "string") return { ok: false, error: "bad_sub_fields", field: "id" };
        if (entry.kind !== "projection" && entry.kind !== "writes" && entry.kind !== "identification") {
            return { ok: false, error: "unknown_kind", field: String(entry.kind) };
        }
        subs.push({ id: entry.id, kind: entry.kind, raw: entry });
    }
    return { ok: true, subs };
}

// multiplexed per-user live stream. ONE EventSource per dashboard handles N
// subscriptions across kinds (projection topics, db writes, identity updates),
// eliminating browser HTTP/1.1 6-connections-per-origin saturation. client sends
// ?subs=<json-array> where each entry = { id, kind, ...kindParams }. server emits
// { id, payload } tagged with the originating sub id. browser auto-reconnect
// re-emits all snapshots — idempotent on subscribers.
router.get("/me/stream", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const subsRaw = typeof req.query.subs === "string" ? req.query.subs : null;
    if (subsRaw === null) {
        res.status(HTTP_BAD_REQUEST).json({ error: "missing_subs" });
        return;
    }
    let subsInput: unknown;
    try {
        subsInput = JSON.parse(subsRaw);
    } catch {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_subs_json" });
        return;
    }
    const parsed = parseSubs(subsInput);
    if (!parsed.ok) {
        res.status(HTTP_BAD_REQUEST).json({ error: parsed.error, field: parsed.field });
        return;
    }
    for (const sub of parsed.subs) {
        if (sub.kind !== "projection") continue;
        if (typeof sub.raw.topic !== "string") {
            res.status(HTTP_BAD_REQUEST).json({ error: "missing_topic", id: sub.id });
            return;
        }
        const topicParams =
            sub.raw.params && typeof sub.raw.params === "object" ? (sub.raw.params as Record<string, unknown>) : {};
        const def = resolveTopic(sub.raw.topic, siteAccountId, topicParams);
        if (!def) {
            res.status(HTTP_BAD_REQUEST).json({ error: "bad_topic", topic: sub.raw.topic });
            return;
        }
    }
    openEventStream(res);
    const cleanups: Array<() => void> = [];
    const cleanupAll = (): void => {
        for (const c of cleanups) c();
        cleanups.length = 0;
    };
    for (const sub of parsed.subs) {
        if (sub.kind === "projection") {
            const topic = sub.raw.topic as string;
            const topicParams =
                sub.raw.params && typeof sub.raw.params === "object" ? (sub.raw.params as Record<string, unknown>) : {};
            const def = resolveTopic(topic, siteAccountId, topicParams)!;
            const handle = subscribeProjection(topic, def, (batch) =>
                writeSseEvent(res, { id: sub.id, payload: { batch } }, cleanupAll),
            );
            cleanups.push(() => handle.unsubscribe());
            writeSseEvent(res, { id: sub.id, payload: { snapshot: handle.baseline } }, cleanupAll);
        } else if (sub.kind === "writes") {
            const scopeByKey = buildWritesScopeMap(siteAccountId);
            const denied = new Set<string>();
            const unsub = subscribeDbWrites((event) => {
                let scope = scopeByKey.get(event.scopeKey);
                let scopeAdded = false;
                if (!scope) {
                    if (denied.has(event.scopeKey)) return;
                    if (!canUserSeeScopeKey(siteAccountId, event.scopeKey)) {
                        denied.add(event.scopeKey);
                        return;
                    }
                    const parsedScope = scopeFromScopeKey(event.scopeKey);
                    if (!parsedScope) {
                        denied.add(event.scopeKey);
                        return;
                    }
                    scope = parsedScope;
                    scopeByKey.set(event.scopeKey, parsedScope);
                    scopeAdded = true;
                }
                const base = scopeAdded ? { ...event, scopeAdded: true } : event;
                const payload =
                    event.kind === "delete"
                        ? { ...base, nowHasRows: tableHasUserRows(siteAccountId, scope, event.table) }
                        : base;
                writeSseEvent(res, { id: sub.id, payload }, cleanupAll);
            });
            cleanups.push(unsub);
        } else if (sub.kind === "identification") {
            const unsub = subscribeIdentityStream(siteAccountId, (event) => {
                writeSseEvent(res, { id: sub.id, payload: event }, cleanupAll);
            });
            cleanups.push(unsub);
        }
    }
    bindStreamLifecycle(req, cleanupAll);
});

export default router;

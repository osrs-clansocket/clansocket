import type { DeltaBatch, SnapshotBaseline } from "@clansocket/realtime";
import type { WritesStreamEvent } from "../types.js";

interface BaseRecord {
    readonly id: string;
}

interface ProjectionRecord extends BaseRecord {
    readonly kind: "projection";
    readonly topic: string;
    readonly params: Record<string, string | number | undefined>;
    readonly onSnapshot: (base: SnapshotBaseline) => void;
    readonly onDelta: (batch: DeltaBatch) => void;
}

interface WritesRecord extends BaseRecord {
    readonly kind: "writes";
    readonly handlers: Set<(event: WritesStreamEvent) => void>;
}

interface IdentificationRecord extends BaseRecord {
    readonly kind: "identification";
    readonly handlers: Set<() => void>;
}

type Record_ = ProjectionRecord | WritesRecord | IdentificationRecord;

const records = new Map<string, Record_>();
let writesSubId: string | null = null;
let identificationSubId: string | null = null;
let es: EventSource | null = null;
let nextId = 1;
let reopenPending = false;
let pageReady = typeof window === "undefined" || document.readyState === "complete";

if (!pageReady && typeof window !== "undefined") {
    window.addEventListener(
        "load",
        () => {
            pageReady = true;
            if (records.size > 0) scheduleReopen();
        },
        { once: true },
    );
}

function buildUrl(): string {
    const subs = [...records.values()].map((r) => {
        if (r.kind === "projection") return { id: r.id, kind: r.kind, topic: r.topic, params: r.params };
        return { id: r.id, kind: r.kind };
    });
    return `/api/data-rights/me/stream?subs=${encodeURIComponent(JSON.stringify(subs))}`;
}

function handleMessage(e: MessageEvent<string>): void {
    let msg: unknown;
    try {
        msg = JSON.parse(e.data);
    } catch {
        return;
    }
    if (!msg || typeof msg !== "object") return;
    const m = msg as { id?: unknown; payload?: unknown };
    if (typeof m.id !== "string") return;
    const rec = records.get(m.id);
    if (!rec) return;
    const payload = m.payload;
    if (rec.kind === "projection") {
        const p = payload as { snapshot?: SnapshotBaseline; batch?: DeltaBatch };
        if (p.snapshot) rec.onSnapshot(p.snapshot);
        else if (p.batch) rec.onDelta(p.batch);
        return;
    }
    if (rec.kind === "writes") {
        for (const h of rec.handlers) h(payload as WritesStreamEvent);
        return;
    }
    for (const h of rec.handlers) h();
}

function open(): void {
    if (!pageReady) return;
    if (records.size === 0) return;
    es = new EventSource(buildUrl(), { withCredentials: true });
    es.addEventListener("message", handleMessage as (e: Event) => void);
}

function scheduleReopen(): void {
    if (reopenPending) return;
    reopenPending = true;
    queueMicrotask(() => {
        reopenPending = false;
        if (es) {
            es.close();
            es = null;
        }
        open();
    });
}

export interface ProjectionSubParams {
    readonly topic: string;
    readonly params: Record<string, string | number | undefined>;
    readonly onSnapshot: (base: SnapshotBaseline) => void;
    readonly onDelta: (batch: DeltaBatch) => void;
}

export function subscribeProjectionMux(sub: ProjectionSubParams): () => void {
    const id = `p-${nextId++}`;
    records.set(id, { id, kind: "projection", ...sub });
    scheduleReopen();
    return () => {
        records.delete(id);
        scheduleReopen();
    };
}

export function subscribeWritesMux(handler: (event: WritesStreamEvent) => void): () => void {
    let rec: WritesRecord;
    if (writesSubId === null) {
        const id = `w-${nextId++}`;
        rec = { id, kind: "writes", handlers: new Set() };
        records.set(id, rec);
        writesSubId = id;
        scheduleReopen();
    } else {
        rec = records.get(writesSubId) as WritesRecord;
    }
    rec.handlers.add(handler);
    return () => {
        rec.handlers.delete(handler);
        if (rec.handlers.size === 0) {
            records.delete(rec.id);
            writesSubId = null;
            scheduleReopen();
        }
    };
}

export function subscribeIdentificationMux(handler: () => void): () => void {
    let rec: IdentificationRecord;
    if (identificationSubId === null) {
        const id = `i-${nextId++}`;
        rec = { id, kind: "identification", handlers: new Set() };
        records.set(id, rec);
        identificationSubId = id;
        scheduleReopen();
    } else {
        rec = records.get(identificationSubId) as IdentificationRecord;
    }
    rec.handlers.add(handler);
    return () => {
        rec.handlers.delete(handler);
        if (rec.handlers.size === 0) {
            records.delete(rec.id);
            identificationSubId = null;
            scheduleReopen();
        }
    };
}

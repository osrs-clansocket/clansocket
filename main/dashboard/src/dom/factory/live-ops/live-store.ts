import type { DeltaBatch, RowDelta, SnapshotBaseline } from "@clansocket/realtime";

export type LiveRow = Record<string, unknown>;

export interface LiveSource {
    subscribe(onSnapshot: (base: SnapshotBaseline) => void, onDelta: (batch: DeltaBatch) => void): () => void;
}

export interface LiveStoreConfig<Row extends LiveRow> {
    topic: string;
    keyOf: (row: Row) => string;
    source: LiveSource;
    maxKeys?: number;
}

export interface LiveChange {
    changed: ReadonlySet<string>;
    removed: ReadonlySet<string>;
    revision: number;
}

export interface LiveStore<Row extends LiveRow> {
    start(): void;
    teardown(): void;
    get(key: string): Row | undefined;
    keys(): IterableIterator<string>;
    all(): Row[];
    appendRows(rows: Row[]): void;
    size(): number;
    revision(): number;
    seq(): number;
    onChange(listener: (change: LiveChange) => void): () => void;
    setHidden(hidden: boolean): void;
}

export function createLiveStore<Row extends LiveRow>(config: LiveStoreConfig<Row>): LiveStore<Row> {
    const byKey = new Map<string, Row>();
    const insertion: string[] = [];
    const listeners = new Set<(c: LiveChange) => void>();
    const pendingChanged = new Set<string>();
    const pendingRemoved = new Set<string>();
    let rev = 0;
    let lastSeq = 0;
    let started = false;
    let hidden = false;
    let unsub: (() => void) | null = null;

    function evictIfNeeded(): void {
        const cap = config.maxKeys;
        if (cap === undefined) return;
        while (byKey.size > cap && insertion.length > 0) {
            const oldest = insertion.pop();
            if (oldest !== undefined && byKey.delete(oldest)) pendingRemoved.add(oldest);
        }
    }

    function applyDelta(d: RowDelta): void {
        if (d.seq <= lastSeq) return;
        lastSeq = d.seq;
        if (d.op === "remove") {
            if (byKey.delete(d.key)) {
                const at = insertion.indexOf(d.key);
                if (at >= 0) insertion.splice(at, 1);
                pendingRemoved.add(d.key);
                pendingChanged.delete(d.key);
            }
            return;
        }
        if (d.row === null) return;
        if (!byKey.has(d.key)) insertion.unshift(d.key);
        byKey.set(d.key, d.row as Row);
        pendingChanged.add(d.key);
        pendingRemoved.delete(d.key);
    }

    function commit(): void {
        if (pendingChanged.size === 0 && pendingRemoved.size === 0) return;
        evictIfNeeded();
        rev++;
        const change: LiveChange = {
            changed: new Set(pendingChanged),
            removed: new Set(pendingRemoved),
            revision: rev,
        };
        pendingChanged.clear();
        pendingRemoved.clear();
        for (const fn of [...listeners]) fn(change);
    }

    function ingest(batch: DeltaBatch): void {
        for (const d of batch.deltas) applyDelta(d);
        if (!hidden) commit();
    }

    function syncBaseline(base: SnapshotBaseline): void {
        const next = new Set<string>();
        const order: string[] = [];
        for (const row of base.rows as Row[]) {
            const key = config.keyOf(row);
            next.add(key);
            order.push(key);
            byKey.set(key, row);
            pendingChanged.add(key);
        }
        for (const key of [...insertion]) {
            if (!next.has(key)) {
                byKey.delete(key);
                pendingRemoved.add(key);
            }
        }
        insertion.length = 0;
        for (const k of order) insertion.push(k);
        lastSeq = base.seq;
        if (!hidden) commit();
    }

    return {
        start(): void {
            if (started) return;
            started = true;
            unsub = config.source.subscribe(syncBaseline, ingest);
        },
        teardown(): void {
            unsub?.();
            unsub = null;
            started = false;
            listeners.clear();
            byKey.clear();
            insertion.length = 0;
            pendingChanged.clear();
            pendingRemoved.clear();
        },
        get: (key) => byKey.get(key),
        keys: () => insertion.values(),
        all: () => {
            const out: Row[] = [];
            for (const key of insertion) {
                const row = byKey.get(key);
                if (row !== undefined) out.push(row);
            }
            return out;
        },
        appendRows(rows: Row[]): void {
            for (const row of rows) {
                const key = config.keyOf(row);
                if (byKey.has(key)) continue;
                insertion.push(key);
                byKey.set(key, row);
                pendingChanged.add(key);
            }
            if (!hidden) commit();
        },
        size: () => byKey.size,
        revision: () => rev,
        seq: () => lastSeq,
        onChange(listener): () => void {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        setHidden(next): void {
            if (hidden === next) return;
            hidden = next;
            if (!hidden) commit();
        },
    };
}

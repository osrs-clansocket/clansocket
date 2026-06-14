import type { DeltaBatch, RowDelta, SnapshotBaseline } from "@clansocket/realtime";
import { subscribeDbWrites } from "./writes-stream.js";

// tier-A projection engine (query+diff), generic over the data source. a topic declares
// which (scopeKey, table) writes recompute it, how to fetch its current rows, and how to
// key a row. on a matching write the engine re-runs query(), diffs vs the last snapshot,
// and emits only changed rows as content deltas — coalesced end-of-turn. the data-rights
// browse, the five app stores, etc. each supply a topic def; the engine is shared.
export interface ProjectionTrigger {
    scopeKey: string;
    table: string;
}

export interface ProjectionTopic {
    triggers: ReadonlyArray<ProjectionTrigger>;
    query(): Record<string, unknown>[];
    keyOf(row: Record<string, unknown>): string;
}

export interface ProjectionHandle {
    baseline: SnapshotBaseline;
    unsubscribe(): void;
}

interface TopicState {
    topic: string;
    def: ProjectionTopic;
    snapshot: Map<string, string>;
    seq: number;
    sink: (batch: DeltaBatch) => void;
}

const states = new Set<TopicState>();
const dirty = new Set<TopicState>();
let flushScheduled = false;

function recompute(state: TopicState): void {
    const rows = state.def.query();
    const fromSeq = state.seq;
    const next = new Map<string, string>();
    const deltas: RowDelta[] = [];
    for (const row of rows) {
        const key = state.def.keyOf(row);
        const hash = JSON.stringify(row);
        next.set(key, hash);
        if (state.snapshot.get(key) !== hash) {
            deltas.push({ topic: state.topic, seq: ++state.seq, key, op: "upsert", row });
        }
    }
    for (const key of state.snapshot.keys()) {
        if (!next.has(key)) deltas.push({ topic: state.topic, seq: ++state.seq, key, op: "remove", row: null });
    }
    state.snapshot = next;
    if (deltas.length > 0) state.sink({ topic: state.topic, fromSeq, toSeq: state.seq, deltas });
}

function flushDirty(): void {
    flushScheduled = false;
    const batch = [...dirty];
    dirty.clear();
    for (const state of batch) recompute(state);
}

function triggered(state: TopicState, scopeKey: string, table: string): boolean {
    for (const t of state.def.triggers) {
        if (t.scopeKey === scopeKey && t.table === table) return true;
    }
    return false;
}

function markDirty(scopeKey: string, table: string): void {
    let matched = false;
    for (const state of states) {
        if (triggered(state, scopeKey, table)) {
            dirty.add(state);
            matched = true;
        }
    }
    if (matched && !flushScheduled) {
        flushScheduled = true;
        setImmediate(flushDirty);
    }
}

subscribeDbWrites((event) => markDirty(event.scopeKey, event.table));

function seedBaseline(state: TopicState): SnapshotBaseline {
    const rows = state.def.query();
    const baselineRows: Record<string, unknown>[] = [];
    for (const row of rows) {
        state.snapshot.set(state.def.keyOf(row), JSON.stringify(row));
        baselineRows.push(row);
    }
    return { topic: state.topic, seq: state.seq, rows: baselineRows };
}

export function subscribeProjection(
    topic: string,
    def: ProjectionTopic,
    sink: (batch: DeltaBatch) => void,
): ProjectionHandle {
    const state: TopicState = { topic, def, snapshot: new Map(), seq: 0, sink };
    states.add(state);
    return {
        baseline: seedBaseline(state),
        unsubscribe(): void {
            states.delete(state);
            dirty.delete(state);
        },
    };
}

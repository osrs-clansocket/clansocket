import { signal, type ReadSignal } from "../../../dom/factory/reactive";
import { createLiveStore, type LiveSource } from "../../../dom/factory/live-ops";
import { projectionSource } from "../../data-rights/data-rights-client/streams/projection-source.js";
import type { ManagedClan } from "../clans-client/index.js";

const live$ = signal<ManagedClan[]>([]);

let resolveReady: (() => void) | null = null;
const readyPromise = new Promise<void>((res) => {
    resolveReady = res;
});

const base = projectionSource({ topic: "member_clans" });
const source: LiveSource = {
    subscribe(onSnapshot, onDelta) {
        return base.subscribe((snap) => {
            onSnapshot(snap);
            resolveReady?.();
            resolveReady = null;
        }, onDelta);
    },
};

const store = createLiveStore<Record<string, unknown>>({
    topic: "member_clans",
    keyOf: (row) => String(row.id),
    source,
});

let started = false;
function ensure(): void {
    if (started) return;
    started = true;
    store.onChange(() => live$.set(store.all() as unknown as ManagedClan[]));
    store.start();
}

export const memberClansStore = {
    get member$(): ReadSignal<ManagedClan[]> {
        ensure();
        return live$;
    },
    ready(): Promise<void> {
        ensure();
        return readyPromise;
    },
    refresh(): void {
        ensure();
    },
    teardown(): void {
        store.teardown();
        started = false;
    },
};

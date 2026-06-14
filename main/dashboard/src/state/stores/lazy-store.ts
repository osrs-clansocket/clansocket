import { signal, type ReadSignal } from "../../dom/factory/reactive";
import { events } from "../../managers/events";
import type { DeltaBatch, RowDelta } from "@clansocket/realtime";

type Unsub = () => void;

export function pollEvery(ms: number): (refetch: () => void) => Unsub {
    return (refetch) => {
        const handle = window.setInterval(refetch, ms);
        return () => window.clearInterval(handle);
    };
}

export function onEvent(name: string): (refetch: () => void) => Unsub {
    return (refetch) => events.on(name, refetch);
}

export interface DeltaFeed<T> {
    topic: string;
    subscribe: (sink: (batch: DeltaBatch) => void) => Unsub;
    apply?: (current: T, delta: RowDelta) => T;
}

export interface FetchStore {
    refresh(): Promise<void>;
    teardown(): void;
    ensure(): void;
}

export interface FetchStoreConfig<T, K extends string> {
    key: K;
    initial: T;
    load: () => Promise<T>;
    subscribe: (refetch: () => void) => Unsub;
    delta?: DeltaFeed<T>;
    onSuccess?: () => void;
    onError?: (err: unknown) => void;
    rethrow?: boolean;
}

export function createFetchStore<T, K extends string>(
    config: FetchStoreConfig<T, K>,
): FetchStore & { readonly [P in K]: ReadSignal<T> } {
    const data = signal<T>(config.initial);
    let started = false;
    let unsub: Unsub | null = null;

    async function fetchOnce(): Promise<void> {
        try {
            data.set(await config.load());
            config.onSuccess?.();
        } catch (err) {
            if (config.onError) config.onError(err);
            else if (config.rethrow) throw err;
        }
    }

    function subscribeDelta(feed: DeltaFeed<T>): Unsub {
        let lastSeq = 0;
        const apply = feed.apply ?? ((_current: T, d: RowDelta): T => d.row as T);
        return feed.subscribe((batch) => {
            for (const d of batch.deltas) {
                if (d.seq <= lastSeq) continue;
                lastSeq = d.seq;
                data.set(apply(data(), d));
            }
        });
    }

    let unsubVisibility: Unsub | null = null;
    function bindVisibilityRefresh(): Unsub {
        const onVisible = (): void => {
            if (document.visibilityState === "visible") void fetchOnce();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }

    function ensure(): void {
        if (started) return;
        started = true;
        void fetchOnce();
        unsub = config.delta ? subscribeDelta(config.delta) : config.subscribe(() => void fetchOnce());
        unsubVisibility = bindVisibilityRefresh();
    }

    const store: FetchStore = {
        refresh(): Promise<void> {
            ensure();
            return fetchOnce();
        },
        teardown(): void {
            unsub?.();
            unsub = null;
            unsubVisibility?.();
            unsubVisibility = null;
            started = false;
        },
        ensure,
    };
    Object.defineProperty(store, config.key, {
        get(): ReadSignal<T> {
            ensure();
            return data;
        },
        enumerable: true,
    });
    return store as FetchStore & { readonly [P in K]: ReadSignal<T> };
}

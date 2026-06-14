import { signal, type ReadSignal } from "../../dom/factory/reactive";
import { AppEvents } from "../../managers/events";
import { memoryClient, type MemoryFile } from "../../ai/memory-client";
import { createFetchStore, onEvent } from "./lazy-store";

const _error = signal<string | null>(null);

const base = createFetchStore<MemoryFile[], "files$">({
    key: "files$",
    initial: [],
    load: () => memoryClient.list(),
    subscribe: onEvent(AppEvents.MEMORY_CHANGED),
    onSuccess: () => _error.set(null),
    onError: (err) => _error.set((err as Error).message),
});

export const memoryStore = {
    get files$(): ReadSignal<MemoryFile[]> {
        return base.files$;
    },
    get error$(): ReadSignal<string | null> {
        base.ensure();
        return _error;
    },
    refresh: base.refresh,
    teardown: base.teardown,
};

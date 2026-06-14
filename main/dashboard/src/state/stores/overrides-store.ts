import { signal, type Signal } from "../../dom/factory/reactive";

export interface OverridesStoreOpts<T extends Record<string, unknown>> {
    readStored: () => T;
    writeStored: (next: T) => void;
    storageKey: string;
}

export interface OverridesStore<T extends Record<string, unknown>> {
    data$: Signal<Readonly<T>>;
    commit: (next: T) => void;
}

export function createOverridesStore<T extends Record<string, unknown>>(
    opts: OverridesStoreOpts<T>,
): OverridesStore<T> {
    const data = signal<Readonly<T>>(Object.freeze(opts.readStored()));

    if (typeof window !== "undefined") {
        window.addEventListener("storage", (e) => {
            if (e.key === null || e.key === opts.storageKey) {
                data.set(Object.freeze(opts.readStored()));
            }
        });
    }

    function commit(next: T): void {
        opts.writeStored(next);
        data.set(Object.freeze({ ...next }));
    }

    return { data$: data, commit };
}

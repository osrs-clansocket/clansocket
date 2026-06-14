import { signal, type ReadSignal } from "../../../dom/factory/reactive";
import { createLiveStore } from "../../../dom/factory/live-ops";
import { projectionSource } from "../../data-rights/data-rights-client/streams/projection-source.js";
import type { AppNotification } from "../notifications-client.js";

const live$ = signal<AppNotification[]>([]);
const store = createLiveStore<Record<string, unknown>>({
    topic: "notifications",
    keyOf: (row) => String(row.id),
    source: projectionSource({ topic: "notifications" }),
});

let started = false;
function ensure(): void {
    if (started) return;
    started = true;
    store.onChange(() => live$.set(store.all() as unknown as AppNotification[]));
    store.start();
}

export const notificationsStore = {
    get list$(): ReadSignal<AppNotification[]> {
        ensure();
        return live$;
    },
    refresh(): void {
        ensure();
    },
    teardown(): void {
        store.teardown();
        started = false;
    },
};

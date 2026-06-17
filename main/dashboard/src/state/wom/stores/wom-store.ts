import { signal } from "../../../dom/factory";
import { getWomStatus, openWomStream, type WomStatus } from "../clients/wom-client.js";

export interface WomStore {
    status$(): WomStatus;
    ensure(): Promise<void>;
    refresh(): Promise<void>;
    dispose(): void;
}

const stores = new Map<string, WomStore>();
const EMPTY_STATUS: WomStatus = { linked: false };

function createWomStore(slug: string): WomStore {
    const statusSig = signal<WomStatus>(EMPTY_STATUS);
    let initialized = false;
    let unsubscribe: () => void = () => undefined;

    async function refresh(): Promise<void> {
        const next = await getWomStatus(slug);
        statusSig.set(next);
    }

    async function ensure(): Promise<void> {
        if (initialized) return;
        initialized = true;
        await refresh();
        unsubscribe = openWomStream(slug, () => void refresh());
    }

    function dispose(): void {
        unsubscribe();
        initialized = false;
    }

    return {
        status$: () => statusSig(),
        ensure,
        refresh,
        dispose,
    };
}

export function womStoreFor(slug: string): WomStore {
    const existing = stores.get(slug);
    if (existing) return existing;
    const next = createWomStore(slug);
    stores.set(slug, next);
    return next;
}

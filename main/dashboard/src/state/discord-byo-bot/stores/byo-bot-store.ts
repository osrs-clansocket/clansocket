import { signal } from "../../../dom/factory";
import { getByoBotStatus, openByoBotStream, type ByoBotStatus } from "../clients/byo-bot-client.js";

export interface ByoBotStore {
    status$(): ByoBotStatus;
    ensure(): Promise<void>;
    refresh(): Promise<void>;
    dispose(): void;
}

const stores = new Map<string, ByoBotStore>();
const EMPTY_STATUS: ByoBotStatus = { linked: false };

function createByoBotStore(slug: string): ByoBotStore {
    const statusSig = signal<ByoBotStatus>(EMPTY_STATUS);
    let initialized = false;
    let unsubscribe: () => void = () => undefined;

    async function refresh(): Promise<void> {
        const next = await getByoBotStatus(slug);
        statusSig.set(next);
    }

    async function ensure(): Promise<void> {
        if (initialized) return;
        initialized = true;
        await refresh();
        unsubscribe = openByoBotStream(slug, () => void refresh());
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

export function byoBotStoreFor(slug: string): ByoBotStore {
    const existing = stores.get(slug);
    if (existing) return existing;
    const next = createByoBotStore(slug);
    stores.set(slug, next);
    return next;
}

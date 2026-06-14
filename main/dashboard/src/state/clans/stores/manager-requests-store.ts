import { clansClient } from "../clans-client/index.js";
import { createFetchStore, type FetchStore } from "../../stores/lazy-store.js";
import { dataRightsClient } from "../../data-rights/data-rights-client/index.js";
import type { ReadSignal } from "../../../dom/factory/reactive";

const MR_REFRESH_MS = 3000;

export type ManagerRequest = Awaited<ReturnType<typeof clansClient.listManagerRequests>>[number];

type ManagerRequestsStore = FetchStore & { readonly requests$: ReadSignal<ManagerRequest[]> };

export function createManagerRequestsStore(slug: string): ManagerRequestsStore {
    return createFetchStore<ManagerRequest[], "requests$">({
        key: "requests$",
        initial: [],
        load: () => clansClient.listManagerRequests(slug),
        subscribe: (refetch) => {
            let last = 0;
            return dataRightsClient.openWritesStream(() => {
                const now = Date.now();
                if (now - last < MR_REFRESH_MS) return;
                last = now;
                refetch();
            });
        },
    });
}

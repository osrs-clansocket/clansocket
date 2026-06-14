import { dataRightsClient, type UserDataStats } from "../data-rights-client/index.js";
import { createFetchStore } from "../../stores/lazy-store.js";

const STATS_REFRESH_MS = 3000;

export const userStatsStore = createFetchStore<UserDataStats | null, "stats$">({
    key: "stats$",
    initial: null,
    load: () => dataRightsClient.getMyDataStats(),
    subscribe: (refetch) => {
        let last = 0;
        return dataRightsClient.openWritesStream(() => {
            const now = Date.now();
            if (now - last < STATS_REFRESH_MS) return;
            last = now;
            refetch();
        });
    },
});

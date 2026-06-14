import { clansClient, type ClanSummary, type WhitelistEntry } from "../clans-client/index.js";
import { createFetchStore, type FetchStore } from "../../stores/lazy-store.js";
import { dataRightsClient } from "../../data-rights/data-rights-client/index.js";
import { fetchClanRankLadder, invalidateClanRankLadder, type ClanRankLadder } from "../../icons/rank-sort.js";
import type { ReadSignal } from "../../../dom/factory/reactive";

const WL_REFRESH_MS = 3000;

export interface WhitelistData {
    summary: ClanSummary | null;
    entries: WhitelistEntry[];
    ladder: ClanRankLadder;
}

type WhitelistStore = FetchStore & { readonly data$: ReadSignal<WhitelistData> };

export function createWhitelistStore(slug: string): WhitelistStore {
    return createFetchStore<WhitelistData, "data$">({
        key: "data$",
        initial: { summary: null, entries: [], ladder: [] },
        load: async () => {
            invalidateClanRankLadder(slug);
            const [summary, entries, ladder] = await Promise.all([
                clansClient.getClan(slug),
                clansClient.listWhitelist(slug),
                fetchClanRankLadder(slug),
            ]);
            return { summary, entries, ladder };
        },
        subscribe: (refetch) => {
            let last = 0;
            return dataRightsClient.openWritesStream(() => {
                const now = Date.now();
                if (now - last < WL_REFRESH_MS) return;
                last = now;
                refetch();
            });
        },
    });
}

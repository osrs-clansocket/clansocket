import type { ReadSignal } from "../../dom/factory/reactive";
import { createFetchStore, type FetchStore } from "../stores/lazy-store.js";
import { sameOriginFetch } from "../../shared/helpers/fetch-helper.js";
import { openDiscordServersStream, type DiscordServer } from "./client.js";

const EMPTY: readonly DiscordServer[] = [];

type ServersData = readonly DiscordServer[] | null;

type DiscordServersStore = FetchStore & { readonly servers: ReadSignal<ServersData> };

const STORES = new Map<string, DiscordServersStore>();

async function loadServers(slug: string): Promise<readonly DiscordServer[]> {
    const res = await sameOriginFetch(`/api/discord/clans/${encodeURIComponent(slug)}/servers`);
    if (!res.ok) return EMPTY;
    const body = (await res.json()) as { servers?: DiscordServer[] };
    return body.servers ?? EMPTY;
}

function makeStore(slug: string): DiscordServersStore {
    return createFetchStore<ServersData, "servers">({
        key: "servers",
        initial: null,
        load: () => loadServers(slug),
        subscribe: (refetch) => openDiscordServersStream(slug, refetch),
    });
}

export function discordServersStoreFor(slug: string): DiscordServersStore {
    const existing = STORES.get(slug);
    if (existing) return existing;
    const store = makeStore(slug);
    STORES.set(slug, store);
    return store;
}

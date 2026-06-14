import { identityClient, type LinkedProvider } from "../identity-client/index.js";
import { createFetchStore, onEvent } from "../../stores/lazy-store.js";

export const providersStore = createFetchStore<LinkedProvider[], "list$">({
    key: "list$",
    initial: [],
    load: async () => (await identityClient.listProviders()).providers,
    subscribe: onEvent("route:change"),
});

import { dataRightsClient, type ScopeListItem } from "../data-rights-client/index.js";
import { createFetchStore, onEvent } from "../../stores/lazy-store.js";

export const scopesStore = createFetchStore<ScopeListItem[], "list$">({
    key: "list$",
    initial: [],
    load: () => dataRightsClient.listScopes(),
    subscribe: onEvent("route:change"),
});

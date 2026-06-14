import { identityClient, type SiteAccount } from "../identity-client/index.js";
import { createFetchStore } from "../../stores/lazy-store.js";

export const identityStore = createFetchStore<SiteAccount | null, "session$">({
    key: "session$",
    initial: null,
    load: () => identityClient.session(),
    subscribe: (refetch) => identityClient.openIdentificationStream(refetch),
    rethrow: true,
});

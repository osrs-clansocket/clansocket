import { consentClient, type ConsentRecord } from "../consent/consent-client.js";
import { identityClient } from "../identity-client/index.js";
import { createFetchStore } from "../../stores/lazy-store.js";

export const consentsStore = createFetchStore<ConsentRecord[], "list$">({
    key: "list$",
    initial: [],
    load: () => consentClient.listConsents(),
    subscribe: (refetch) => identityClient.openIdentificationStream(refetch),
});

import { identityClient, type Identification } from "../identity-client/index.js";
import { createFetchStore } from "../../stores/lazy-store.js";

export const identificationStore = createFetchStore<Identification | null, "identification$">({
    key: "identification$",
    initial: null,
    load: () => identityClient.getIdentification(),
    subscribe: (refetch) => identityClient.openIdentificationStream(refetch),
});

import { profileClient, type LiveSession } from "../profile/profile-client.js";
import { identityClient } from "../identity-client/index.js";
import { createFetchStore, pollEvery } from "../../stores/lazy-store.js";

const POLL_MS = 10_000;

export const profileStore = createFetchStore<LiveSession[], "sessions$">({
    key: "sessions$",
    initial: [],
    load: () => profileClient.listSessions(),
    subscribe: (refetch) => {
        const stopPoll = pollEvery(POLL_MS)(refetch);
        const stopStream = identityClient.openIdentificationStream(refetch);
        return () => {
            stopPoll();
            stopStream();
        };
    },
});

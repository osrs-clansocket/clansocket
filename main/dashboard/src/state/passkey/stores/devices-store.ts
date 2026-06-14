import { isPasskeyError, passkeyClient, type PasskeyDevice } from "../client/index.js";
import { createFetchStore, onEvent } from "../../stores/lazy-store.js";

export const devicesStore = createFetchStore<PasskeyDevice[], "list$">({
    key: "list$",
    initial: [],
    load: async () => {
        const result = await passkeyClient.listDevices();
        return isPasskeyError(result) ? [] : result.devices;
    },
    subscribe: onEvent("route:change"),
});

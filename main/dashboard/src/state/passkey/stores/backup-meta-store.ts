import { isPasskeyError, passkeyClient } from "../client/index.js";
import { createFetchStore, type FetchStore } from "../../stores/lazy-store.js";
import type { ReadSignal } from "../../../dom/factory/reactive";

export interface BackupMetaState {
    loaded: boolean;
    meta: { generatedAt: number; totalCount: number; remainingCount: number } | null;
}

type BackupMetaStore = FetchStore & { readonly state$: ReadSignal<BackupMetaState> };

export const backupMetaStore: BackupMetaStore = createFetchStore<BackupMetaState, "state$">({
    key: "state$",
    initial: { loaded: false, meta: null },
    load: async (): Promise<BackupMetaState> => {
        const result = await passkeyClient.getBackupCodeMeta();
        return { loaded: true, meta: isPasskeyError(result) ? null : result.meta };
    },
    subscribe: () => (): void => undefined,
});

export { VaultDecryptError, VaultMissingError, VaultPassphraseError } from "./errors.js";
export { setupVault, unlockVault, vaultExists, wipeVault } from "./lifecycle.js";
export { getEntry, listProviders, moveEntry, putEntry, removeEntry, setPriority } from "./entries.js";
export {
    MIN_PASSPHRASE_LENGTH,
    type ProviderConfig,
    type ProviderId,
    type VaultEntry,
    type VaultRecord,
} from "./types.js";

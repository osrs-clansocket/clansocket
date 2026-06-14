export const VAULT_RECORD_KEY = "varez_vault_v1";
export const MIN_PASSPHRASE_LENGTH = 6;
export const VERIFIER_PLAINTEXT = "varez_vault_v1_check";

export interface VaultEntry {
    iv: Uint8Array;
    ciphertext: Uint8Array;
}

export interface VaultRecord {
    salt: Uint8Array;
    iterations: number;
    verifier: VaultEntry;
    entries: Record<string, VaultEntry>;
    priorityOrder?: string[];
    createdAt: number;
    updatedAt: number;
}

export type ProviderId = string;

export interface ProviderConfig {
    apiKey: string;
    maxTokens?: number;
    model?: string;
}

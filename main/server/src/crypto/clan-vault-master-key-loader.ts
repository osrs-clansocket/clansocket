import { AES_GCM_KEY_LENGTH_BYTES } from "../shared/constants/aes-gcm-constants.js";

const ENV_VAR_NAME = "CLANSOCKET_CLAN_VAULT_MASTER_KEY";

let cached: Buffer | null = null;

export function loadClanVaultMasterKey(): Buffer {
    if (cached !== null) return cached;
    const raw = process.env[ENV_VAR_NAME];
    if (!raw) throw new Error(`${ENV_VAR_NAME} not set`);
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== AES_GCM_KEY_LENGTH_BYTES) {
        throw new Error(`${ENV_VAR_NAME} must decode to ${AES_GCM_KEY_LENGTH_BYTES} bytes (got ${buf.length})`);
    }
    cached = buf;
    return buf;
}

export function getClanVaultMasterKey(): Buffer {
    if (cached === null) {
        throw new Error(`${ENV_VAR_NAME} not loaded; call loadClanVaultMasterKey() at server boot`);
    }
    return cached;
}

export function assertClanVaultMasterKeyLoaded(): void {
    if (cached === null) throw new Error(`${ENV_VAR_NAME} not loaded`);
}

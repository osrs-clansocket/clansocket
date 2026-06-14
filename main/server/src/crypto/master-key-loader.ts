import { AES_GCM_KEY_LENGTH_BYTES } from "../shared/constants/aes-gcm-constants.js";

const ENV_VAR_NAME = "DISCORD_TOKEN_ENC_KEY";

export function loadDiscordMasterKeyOrNull(): Buffer | null {
    const raw = process.env[ENV_VAR_NAME];
    if (!raw) return null;
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== AES_GCM_KEY_LENGTH_BYTES) {
        throw new Error(`${ENV_VAR_NAME} must decode to ${AES_GCM_KEY_LENGTH_BYTES} bytes`);
    }
    return buf;
}

export function loadDiscordMasterKey(): Buffer {
    const buf = loadDiscordMasterKeyOrNull();
    if (buf === null) throw new Error(`${ENV_VAR_NAME} not set`);
    return buf;
}

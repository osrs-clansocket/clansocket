import { createDecipheriv } from "node:crypto";
import {
    AES_GCM_ALGORITHM,
    AES_GCM_AUTH_TAG_LENGTH_BYTES,
    AES_GCM_IV_LENGTH_BYTES,
    AES_GCM_KEY_LENGTH_BYTES,
} from "../shared/constants/aes-gcm-constants.js";

export function decryptToken(b64: string, iv: string, masterKey: Buffer): string {
    if (masterKey.length !== AES_GCM_KEY_LENGTH_BYTES) {
        throw new Error(`masterKey must be ${AES_GCM_KEY_LENGTH_BYTES} bytes (got ${masterKey.length})`);
    }
    const ivBuf = Buffer.from(iv, "base64");
    if (ivBuf.length !== AES_GCM_IV_LENGTH_BYTES) {
        throw new Error(`iv must be ${AES_GCM_IV_LENGTH_BYTES} bytes (got ${ivBuf.length})`);
    }
    const combined = Buffer.from(b64, "base64");
    if (combined.length < AES_GCM_AUTH_TAG_LENGTH_BYTES) {
        throw new Error(
            `ciphertext too short (got ${combined.length} bytes, need at least ${AES_GCM_AUTH_TAG_LENGTH_BYTES})`,
        );
    }
    const ciphertext = combined.subarray(0, combined.length - AES_GCM_AUTH_TAG_LENGTH_BYTES);
    const authTag = combined.subarray(combined.length - AES_GCM_AUTH_TAG_LENGTH_BYTES);
    const decipher = createDecipheriv(AES_GCM_ALGORITHM, masterKey, ivBuf);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf-8");
}

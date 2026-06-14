import { createCipheriv, randomBytes } from "node:crypto";
import {
    AES_GCM_ALGORITHM,
    AES_GCM_IV_LENGTH_BYTES,
    AES_GCM_KEY_LENGTH_BYTES,
    type EncryptedToken,
} from "../shared/constants/aes-gcm-constants.js";

export function encryptToken(plaintext: string, masterKey: Buffer): EncryptedToken {
    if (masterKey.length !== AES_GCM_KEY_LENGTH_BYTES) {
        throw new Error(`masterKey must be ${AES_GCM_KEY_LENGTH_BYTES} bytes (got ${masterKey.length})`);
    }
    const iv = randomBytes(AES_GCM_IV_LENGTH_BYTES);
    const cipher = createCipheriv(AES_GCM_ALGORITHM, masterKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        b64: Buffer.concat([ciphertext, authTag]).toString("base64"),
        iv: iv.toString("base64"),
    };
}

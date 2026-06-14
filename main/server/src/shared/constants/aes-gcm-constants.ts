export const AES_GCM_ALGORITHM = "aes-256-gcm";
export const AES_GCM_KEY_LENGTH_BYTES = 32;
export const AES_GCM_IV_LENGTH_BYTES = 12;
export const AES_GCM_AUTH_TAG_LENGTH_BYTES = 16;

export interface EncryptedToken {
    b64: string;
    iv: string;
}

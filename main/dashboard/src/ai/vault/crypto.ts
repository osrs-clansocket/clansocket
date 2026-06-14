const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = "SHA-256";
const AES_NAME = "AES-GCM";
const AES_KEY_BITS = 256;
const AES_IV_BYTES = 12;
const SALT_BYTES = 32;
const KEY_EXTRACTABLE = false;

export interface DerivedKey {
    key: CryptoKey;
}

export interface EncryptedBlob {
    iv: Uint8Array;
    ciphertext: Uint8Array;
}

function normalizePassphrase(raw: string): string {
    return raw.trim().normalize("NFC");
}

function utf8Bytes(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

function randomBytes(byteLength: number): Uint8Array {
    const buf = new Uint8Array(new ArrayBuffer(byteLength));
    crypto.getRandomValues(buf);
    return buf;
}

function toBufferSource(arr: Uint8Array): BufferSource {
    return arr as unknown as BufferSource;
}

async function importPassphraseKeyMaterial(passphrase: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "raw",
        toBufferSource(utf8Bytes(normalizePassphrase(passphrase))),
        { name: "PBKDF2" },
        false,
        ["deriveKey"],
    );
}

export function newSalt(): Uint8Array {
    return randomBytes(SALT_BYTES);
}

export function newIv(): Uint8Array {
    return randomBytes(AES_IV_BYTES);
}

export async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<DerivedKey> {
    const baseKey = await importPassphraseKeyMaterial(passphrase);
    const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: toBufferSource(salt), iterations, hash: PBKDF2_HASH },
        baseKey,
        { name: AES_NAME, length: AES_KEY_BITS },
        KEY_EXTRACTABLE,
        ["encrypt", "decrypt"],
    );
    return { key };
}

export async function encrypt(derived: DerivedKey, plaintext: string): Promise<EncryptedBlob> {
    const iv = newIv();
    const ciphertextBuf = await crypto.subtle.encrypt(
        { name: AES_NAME, iv: toBufferSource(iv) },
        derived.key,
        toBufferSource(utf8Bytes(plaintext)),
    );
    return { iv, ciphertext: new Uint8Array(ciphertextBuf) };
}

export async function decrypt(derived: DerivedKey, blob: EncryptedBlob): Promise<string> {
    const plainBuf = await crypto.subtle.decrypt(
        { name: AES_NAME, iv: toBufferSource(blob.iv) },
        derived.key,
        toBufferSource(blob.ciphertext),
    );
    return new TextDecoder().decode(plainBuf);
}

export const DEFAULT_ITERATIONS = PBKDF2_ITERATIONS;

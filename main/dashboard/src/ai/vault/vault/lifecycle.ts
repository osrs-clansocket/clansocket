import { DEFAULT_ITERATIONS, decrypt, deriveKey, encrypt, newSalt, type DerivedKey } from "../crypto";
import { VaultDecryptError, VaultMissingError, VaultPassphraseError } from "./errors.js";
import { deleteRecord, readRecord, writeRecord } from "./storage.js";
import { MIN_PASSPHRASE_LENGTH, VERIFIER_PLAINTEXT, type VaultRecord } from "./types.js";

export async function vaultExists(): Promise<boolean> {
    const r = await readRecord();
    return r !== null;
}

function validatePassphraseShape(passphrase: string): void {
    if (passphrase.trim().length < MIN_PASSPHRASE_LENGTH) {
        throw new VaultPassphraseError(`passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`);
    }
}

export async function setupVault(passphrase: string): Promise<DerivedKey> {
    validatePassphraseShape(passphrase);
    if (await vaultExists()) {
        throw new VaultPassphraseError("vault already exists");
    }
    const salt = newSalt();
    const iterations = DEFAULT_ITERATIONS;
    const derived = await deriveKey(passphrase, salt, iterations);
    const verifierBlob = await encrypt(derived, VERIFIER_PLAINTEXT);
    const now = Date.now();
    await writeRecord({
        salt,
        iterations,
        verifier: { iv: verifierBlob.iv, ciphertext: verifierBlob.ciphertext },
        entries: {},
        priorityOrder: [],
        createdAt: now,
        updatedAt: now,
    });
    return derived;
}

async function loadAndDerive(passphrase: string): Promise<{ record: VaultRecord; derived: DerivedKey }> {
    const record = await readRecord();
    if (!record) throw new VaultMissingError();
    const derived = await deriveKey(passphrase, record.salt, record.iterations);
    return { record, derived };
}

export async function unlockVault(passphrase: string): Promise<DerivedKey> {
    const { record, derived } = await loadAndDerive(passphrase);
    try {
        const plaintext = await decrypt(derived, record.verifier);
        if (plaintext !== VERIFIER_PLAINTEXT) throw new VaultDecryptError();
    } catch {
        throw new VaultDecryptError();
    }
    return derived;
}

export async function wipeVault(): Promise<void> {
    await deleteRecord();
}

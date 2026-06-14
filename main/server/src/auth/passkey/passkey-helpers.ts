import { randomUUID } from "node:crypto";
import type { AuthenticatorTransportFuture, WebAuthnCredential } from "@simplewebauthn/server";
import { DB_NAMES, getDb } from "../../database/index.js";

export interface PasskeyRow {
    id: string;
    site_account_id: string;
    credential_id: string;
    public_key: Buffer;
    sign_count: number;
    device_name: string | null;
    created_at: number;
    last_used_at: number | null;
}

export interface NewPasskey {
    siteAccountId: string;
    credentialId: string;
    publicKey: Buffer;
    deviceName: string | null;
}

export function insertPasskey(args: NewPasskey): PasskeyRow {
    const id = randomUUID();
    const now = Date.now();
    const db = getDb(DB_NAMES.APP);
    db.prepare(
        `INSERT INTO clansocket_passkeys (id, site_account_id, credential_id, public_key, sign_count, device_name, created_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
    ).run(id, args.siteAccountId, args.credentialId, args.publicKey, args.deviceName, now);
    return {
        id,
        site_account_id: args.siteAccountId,
        credential_id: args.credentialId,
        public_key: args.publicKey,
        sign_count: 0,
        device_name: args.deviceName,
        created_at: now,
        last_used_at: null,
    };
}

export function findPasskeyByCredentialId(credentialId: string): PasskeyRow | null {
    const db = getDb(DB_NAMES.APP);
    const row = db
        .prepare(
            `SELECT id, site_account_id, credential_id, public_key, sign_count, device_name, created_at, last_used_at
             FROM clansocket_passkeys WHERE credential_id = ?`,
        )
        .get(credentialId) as PasskeyRow | undefined;
    return row ?? null;
}

export function listPasskeysForAccount(siteAccountId: string): PasskeyRow[] {
    const db = getDb(DB_NAMES.APP);
    return db
        .prepare(
            `SELECT id, site_account_id, credential_id, public_key, sign_count, device_name, created_at, last_used_at
             FROM clansocket_passkeys WHERE site_account_id = ?
             ORDER BY created_at DESC`,
        )
        .all(siteAccountId) as PasskeyRow[];
}

export function passkeyCredential(passkey: PasskeyRow): WebAuthnCredential {
    return {
        id: passkey.credential_id,
        publicKey: Uint8Array.from(passkey.public_key) as unknown as WebAuthnCredential["publicKey"],
        counter: passkey.sign_count,
        transports: undefined as unknown as AuthenticatorTransportFuture[] | undefined,
    };
}

export function updatePasskeyAfterAuth(id: string, newSignCount: number): void {
    const db = getDb(DB_NAMES.APP);
    db.prepare(`UPDATE clansocket_passkeys SET sign_count = ?, last_used_at = ? WHERE id = ?`).run(
        newSignCount,
        Date.now(),
        id,
    );
}

export function revokePasskey(id: string, siteAccountId: string): boolean {
    const db = getDb(DB_NAMES.APP);
    const result = db
        .prepare(`DELETE FROM clansocket_passkeys WHERE id = ? AND site_account_id = ?`)
        .run(id, siteAccountId);
    return result.changes > 0;
}

export function countPasskeysForAccount(siteAccountId: string): number {
    const db = getDb(DB_NAMES.APP);
    const row = db
        .prepare(`SELECT COUNT(*) AS n FROM clansocket_passkeys WHERE site_account_id = ?`)
        .get(siteAccountId) as { n: number };
    return row.n;
}

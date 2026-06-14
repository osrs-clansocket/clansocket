import { DB_NAMES, getDb } from "../../core/database.js";
import { CONSENT_COLUMNS, type ConsentKind, type ConsentRequestRow } from "./types.js";

export function findPendingConsentsForAccountHash(accountHash: string, kind?: ConsentKind): ConsentRequestRow[] {
    const db = getDb(DB_NAMES.APP);
    if (kind) {
        return db
            .prepare(
                `SELECT ${CONSENT_COLUMNS}
                 FROM clansocket_consent_requests
                 WHERE target_account_hash = ? AND kind = ? AND status = 'pending' AND expires_at > ?
                 ORDER BY created_at ASC`,
            )
            .all(accountHash, kind, Date.now()) as ConsentRequestRow[];
    }
    return db
        .prepare(
            `SELECT ${CONSENT_COLUMNS}
             FROM clansocket_consent_requests
             WHERE target_account_hash = ? AND status = 'pending' AND expires_at > ?
             ORDER BY created_at ASC`,
        )
        .all(accountHash, Date.now()) as ConsentRequestRow[];
}

export function findPendingConsentsForRsn(rsn: string, kind?: ConsentKind): ConsentRequestRow[] {
    const db = getDb(DB_NAMES.APP);
    if (kind) {
        return db
            .prepare(
                `SELECT ${CONSENT_COLUMNS}
                 FROM clansocket_consent_requests
                 WHERE LOWER(target_rsn) = LOWER(?) AND kind = ? AND status = 'pending' AND expires_at > ?
                 ORDER BY created_at ASC`,
            )
            .all(rsn, kind, Date.now()) as ConsentRequestRow[];
    }
    return db
        .prepare(
            `SELECT ${CONSENT_COLUMNS}
             FROM clansocket_consent_requests
             WHERE LOWER(target_rsn) = LOWER(?) AND status = 'pending' AND expires_at > ?
             ORDER BY created_at ASC`,
        )
        .all(rsn, Date.now()) as ConsentRequestRow[];
}

export function findPendingConsentsForSiteAccount(siteAccountId: string, kind?: ConsentKind): ConsentRequestRow[] {
    const db = getDb(DB_NAMES.APP);
    if (kind) {
        return db
            .prepare(
                `SELECT ${CONSENT_COLUMNS}
                 FROM clansocket_consent_requests
                 WHERE requesting_site_account_id = ? AND kind = ? AND status = 'pending'
                 ORDER BY created_at DESC`,
            )
            .all(siteAccountId, kind) as ConsentRequestRow[];
    }
    return db
        .prepare(
            `SELECT ${CONSENT_COLUMNS}
             FROM clansocket_consent_requests
             WHERE requesting_site_account_id = ? AND status = 'pending'
             ORDER BY created_at DESC`,
        )
        .all(siteAccountId) as ConsentRequestRow[];
}

export function findAllConsentsForSiteAccount(siteAccountId: string): ConsentRequestRow[] {
    const db = getDb(DB_NAMES.APP);
    return db
        .prepare(
            `SELECT ${CONSENT_COLUMNS}
             FROM clansocket_consent_requests
             WHERE requesting_site_account_id = ?
             ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC`,
        )
        .all(siteAccountId) as ConsentRequestRow[];
}

export function findConsentRequestById(id: number): ConsentRequestRow | null {
    const db = getDb(DB_NAMES.APP);
    return (
        (db
            .prepare(
                `SELECT ${CONSENT_COLUMNS}
                 FROM clansocket_consent_requests WHERE id = ?`,
            )
            .get(id) as ConsentRequestRow | undefined) ?? null
    );
}

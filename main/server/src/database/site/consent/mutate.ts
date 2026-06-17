import { DB_NAMES, getDb } from "../../core/database.js";

export function expirePendingConsents(now: number = Date.now()): number {
    const db = getDb(DB_NAMES.APP);
    return db
        .prepare(
            `UPDATE clansocket_consent_requests
             SET status = 'expired', resolved_at = $now
             WHERE status = 'pending' AND expires_at < $now`,
        )
        .run({ now }).changes;
}

export function cancelConsentRequest(id: number, requestingSiteAccountId: string): boolean {
    const db = getDb(DB_NAMES.APP);
    return (
        db
            .prepare(
                `UPDATE clansocket_consent_requests
                 SET status = 'cancelled', resolved_at = ?
                 WHERE id = ? AND requesting_site_account_id = ? AND status = 'pending'`,
            )
            .run(Date.now(), id, requestingSiteAccountId).changes > 0
    );
}

export function resolveConsentRequest(id: number, action: "confirmed" | "rejected"): boolean {
    const db = getDb(DB_NAMES.APP);
    return (
        db
            .prepare(
                `UPDATE clansocket_consent_requests
                 SET status = ?, resolved_at = ?
                 WHERE id = ? AND status = 'pending'`,
            )
            .run(action, Date.now(), id).changes > 0
    );
}

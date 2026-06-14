import { DB_NAMES, getDb } from "../../core/database.js";
import { type ConsentRequestRow, type CreateConsentArgs, TTL_BY_KIND } from "./types.js";

function insertConsentRow(args: CreateConsentArgs, now: number, expiresAt: number): number {
    const db = getDb(DB_NAMES.APP);
    const result = db
        .prepare(
            `INSERT INTO clansocket_consent_requests
                (kind, requesting_site_account_id, target_account_hash, target_rsn,
                 declared_clan_name, declared_clan_slug, declared_clan_id,
                 status, created_at, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        )
        .run(
            args.kind,
            args.requestingSiteAccountId,
            args.targetAccountHash,
            args.targetRsn,
            args.declaredClanName ?? null,
            args.declaredClanSlug ?? null,
            args.declaredClanId ?? null,
            now,
            expiresAt,
        );
    return Number(result.lastInsertRowid);
}

export function createConsentRequest(args: CreateConsentArgs): ConsentRequestRow {
    const now = Date.now();
    const expiresAt = now + (args.ttlMs ?? TTL_BY_KIND[args.kind]);
    const id = insertConsentRow(args, now, expiresAt);
    return {
        id,
        kind: args.kind,
        requesting_site_account_id: args.requestingSiteAccountId,
        target_account_hash: args.targetAccountHash,
        target_rsn: args.targetRsn,
        declared_clan_name: args.declaredClanName ?? null,
        declared_clan_slug: args.declaredClanSlug ?? null,
        declared_clan_id: args.declaredClanId ?? null,
        status: "pending",
        created_at: now,
        expires_at: expiresAt,
        resolved_at: null,
    };
}

import { DB_NAMES, getDb } from "../../core/database.js";
import { execMutation, getMany, getOne, runMutation } from "../../core/db-helpers.js";
import type { SiteAccountRow } from "./types.js";

export function bindSiteAccountAccountHash(siteAccountId: string, accountHash: string): void {
    const now = Date.now();
    const db = getDb(DB_NAMES.APP);
    const rsnRow = db
        .prepare("SELECT rsn FROM clansocket_account_rsns WHERE account_hash = ? ORDER BY last_seen DESC LIMIT 1")
        .get(accountHash) as { rsn: string } | undefined;
    const rsn = rsnRow?.rsn ?? null;
    execMutation(
        db,
        `INSERT INTO clansocket_account_bindings (site_account_id, account_hash, rsn, bound_at, last_seen_at, revoked_at)
         VALUES (?, ?, ?, ?, ?, NULL)
         ON CONFLICT(site_account_id, account_hash) DO UPDATE SET
            rsn = COALESCE(excluded.rsn, rsn),
            last_seen_at = excluded.last_seen_at,
            revoked_at = NULL`,
        siteAccountId,
        accountHash,
        rsn,
        now,
        now,
    );
}

export function listAccountHashesForSiteAccount(siteAccountId: string): string[] {
    const rows = getMany<{ account_hash: string }>(
        getDb(DB_NAMES.APP),
        `SELECT account_hash FROM clansocket_account_bindings
         WHERE site_account_id = ? AND revoked_at IS NULL
         ORDER BY bound_at ASC`,
        siteAccountId,
    );
    return rows.map((r) => r.account_hash);
}

export function findSiteAccountByAccountHash(accountHash: string): SiteAccountRow | null {
    return getOne<SiteAccountRow>(
        getDb(DB_NAMES.APP),
        `SELECT a.id, a.provider, a.provider_user_id, a.display_name, a.avatar_url, a.created_at, a.last_login_at
         FROM clansocket_accounts a
         JOIN clansocket_account_bindings b ON b.site_account_id = a.id
         WHERE b.account_hash = ? AND b.revoked_at IS NULL
         LIMIT 1`,
        accountHash,
    );
}

export function revokeAccountHashBinding(siteAccountId: string, accountHash: string): boolean {
    return runMutation(
        getDb(DB_NAMES.APP),
        `UPDATE clansocket_account_bindings SET revoked_at = ?
         WHERE site_account_id = ? AND account_hash = ? AND revoked_at IS NULL`,
        Date.now(),
        siteAccountId,
        accountHash,
    );
}

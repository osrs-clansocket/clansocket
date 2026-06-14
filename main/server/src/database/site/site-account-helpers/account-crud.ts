import { randomUUID } from "node:crypto";
import { DB_NAMES, getDb } from "../../core/database.js";
import { execMutation, getOne, runMutation } from "../../core/db-helpers.js";
import { SITE_ACCOUNT_COLUMNS, type SiteAccountRow, type SiteAccountUpsertArgs } from "./types.js";

export function upsertSiteAccount(args: SiteAccountUpsertArgs): SiteAccountRow {
    const db = getDb(DB_NAMES.APP);
    const now = Date.now();
    const existing = getOne<SiteAccountRow>(
        db,
        `SELECT ${SITE_ACCOUNT_COLUMNS} FROM clansocket_accounts WHERE provider = ? AND provider_user_id = ?`,
        args.provider,
        args.providerUserId,
    );

    if (existing) {
        execMutation(db, `UPDATE clansocket_accounts SET last_login_at = ? WHERE id = ?`, now, existing.id);
        return { ...existing, last_login_at: now };
    }

    const id = randomUUID();
    const displayName = args.displayName ?? null;
    const avatarUrl = args.avatarUrl ?? null;
    execMutation(
        db,
        `INSERT INTO clansocket_accounts (id, provider, provider_user_id, display_name, avatar_url, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        args.provider,
        args.providerUserId,
        displayName,
        avatarUrl,
        now,
        now,
    );
    return {
        id,
        provider: args.provider,
        provider_user_id: args.providerUserId,
        display_name: displayName,
        avatar_url: avatarUrl,
        created_at: now,
        last_login_at: now,
    };
}

export function getSiteAccountById(id: string): SiteAccountRow | null {
    return getOne<SiteAccountRow>(
        getDb(DB_NAMES.APP),
        `SELECT ${SITE_ACCOUNT_COLUMNS} FROM clansocket_accounts WHERE id = ?`,
        id,
    );
}

export function updateDisplayName(id: string, displayName: string): boolean {
    return runMutation(
        getDb(DB_NAMES.APP),
        `UPDATE clansocket_accounts SET display_name = ? WHERE id = ?`,
        displayName,
        id,
    );
}

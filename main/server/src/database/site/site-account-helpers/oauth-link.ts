import { randomUUID } from "node:crypto";
import { DB_NAMES, getDb } from "../../core/database.js";
import { execMutation, getMany, getOne, runMutation } from "../../core/db-helpers.js";
import { getSiteAccountById } from "./account-crud.js";
import {
    OAuthLinkConflictError,
    type OAuthLinkArgs,
    type OAuthProvider,
    type ProviderRow,
    type SiteAccountRow,
} from "./types.js";

export function findOAuthLink(provider: OAuthProvider, providerUserId: string): string | null {
    const row = getOne<{ site_account_id: string }>(
        getDb(DB_NAMES.APP),
        `SELECT site_account_id FROM clansocket_account_providers WHERE provider = ? AND provider_user_id = ?`,
        provider,
        providerUserId,
    );
    return row ? row.site_account_id : null;
}

export function listProvidersForAccount(siteAccountId: string): ProviderRow[] {
    return getMany<ProviderRow>(
        getDb(DB_NAMES.APP),
        `SELECT site_account_id, provider, provider_user_id, display_name, avatar_url, linked_at
         FROM clansocket_account_providers WHERE site_account_id = ? ORDER BY linked_at ASC`,
        siteAccountId,
    );
}

export function linkOAuthToAccount(siteAccountId: string, args: OAuthLinkArgs): ProviderRow {
    const db = getDb(DB_NAMES.APP);
    const existing = findOAuthLink(args.provider, args.providerUserId);
    if (existing !== null && existing !== siteAccountId) {
        throw new OAuthLinkConflictError("provider_already_linked_elsewhere");
    }
    const already = getOne<{ site_account_id: string }>(
        db,
        `SELECT site_account_id FROM clansocket_account_providers WHERE site_account_id = ? AND provider = ?`,
        siteAccountId,
        args.provider,
    );
    if (already && existing === siteAccountId) {
        execMutation(
            db,
            `UPDATE clansocket_account_providers SET display_name = ?, avatar_url = ?, linked_at = ?
             WHERE site_account_id = ? AND provider = ?`,
            args.displayName ?? null,
            args.avatarUrl ?? null,
            Date.now(),
            siteAccountId,
            args.provider,
        );
    } else if (already) {
        throw new OAuthLinkConflictError("account_already_has_provider");
    } else {
        execMutation(
            db,
            `INSERT INTO clansocket_account_providers
                (site_account_id, provider, provider_user_id, display_name, avatar_url, linked_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            siteAccountId,
            args.provider,
            args.providerUserId,
            args.displayName ?? null,
            args.avatarUrl ?? null,
            Date.now(),
        );
    }
    return {
        site_account_id: siteAccountId,
        provider: args.provider,
        provider_user_id: args.providerUserId,
        display_name: args.displayName ?? null,
        avatar_url: args.avatarUrl ?? null,
        linked_at: Date.now(),
    };
}

export function unlinkProvider(siteAccountId: string, provider: OAuthProvider): boolean {
    return runMutation(
        getDb(DB_NAMES.APP),
        `DELETE FROM clansocket_account_providers WHERE site_account_id = ? AND provider = ?`,
        siteAccountId,
        provider,
    );
}

export function resolveOrCreateOAuthAccount(args: OAuthLinkArgs): SiteAccountRow {
    const db = getDb(DB_NAMES.APP);
    const now = Date.now();
    const existingId = findOAuthLink(args.provider, args.providerUserId);
    if (existingId !== null) {
        execMutation(db, `UPDATE clansocket_accounts SET last_login_at = ? WHERE id = ?`, now, existingId);
        execMutation(
            db,
            `UPDATE clansocket_account_providers SET display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url) WHERE provider = ? AND provider_user_id = ?`,
            args.displayName ?? null,
            args.avatarUrl ?? null,
            args.provider,
            args.providerUserId,
        );
        const refreshed = getSiteAccountById(existingId);
        if (refreshed) return refreshed;
    }
    const id = randomUUID();
    execMutation(
        db,
        `INSERT INTO clansocket_accounts (id, provider, provider_user_id, display_name, avatar_url, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        args.provider,
        args.providerUserId,
        args.displayName ?? null,
        args.avatarUrl ?? null,
        now,
        now,
    );
    execMutation(
        db,
        `INSERT INTO clansocket_account_providers (site_account_id, provider, provider_user_id, display_name, avatar_url, linked_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        id,
        args.provider,
        args.providerUserId,
        args.displayName ?? null,
        args.avatarUrl ?? null,
        now,
    );
    return {
        id,
        provider: args.provider,
        provider_user_id: args.providerUserId,
        display_name: args.displayName ?? null,
        avatar_url: args.avatarUrl ?? null,
        created_at: now,
        last_login_at: now,
    };
}

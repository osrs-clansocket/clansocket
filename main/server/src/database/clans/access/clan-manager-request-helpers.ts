import { randomUUID } from "node:crypto";
import { getDb, DB_NAMES } from "../../core/database.js";
import { execMutation, getMany, getOne, runMutation } from "../../core/db-helpers.js";
import { getClanById } from "../clan-app-helpers.js";

const MANAGER_REQUEST_COLUMNS =
    "id, site_account_id, clan_id, clan_name, clan_slug, declared_rsn, declared_account_hash, plugin_verified, source, status, requested_at, resolved_at, resolved_by_site_account_id";

export type ManagerRequestSource = "site" | "plugin";
export type ManagerRequestStatus = "pending" | "approved" | "denied";

export interface ManagerRequestRow {
    id: string;
    site_account_id: string;
    clan_id: string;
    clan_name: string;
    clan_slug: string;
    declared_rsn: string;
    declared_account_hash: string | null;
    plugin_verified: number;
    source: ManagerRequestSource;
    status: ManagerRequestStatus;
    requested_at: number;
    resolved_at: number | null;
    resolved_by_site_account_id: string | null;
}

export interface CreateRequestArgs {
    siteAccountId: string;
    clanId: string;
    declaredRsn: string;
    source: ManagerRequestSource;
    declaredAccountHash: string | null;
    pluginVerified: boolean;
}

export function createManagerRequest(args: CreateRequestArgs): ManagerRequestRow {
    const db = getDb(DB_NAMES.APP);
    const now = Date.now();
    const existing = getOne<{ id: string }>(
        db,
        `SELECT id FROM clansocket_clan_manager_requests
         WHERE site_account_id = ? AND clan_id = ? AND status = 'pending'`,
        args.siteAccountId,
        args.clanId,
    );
    if (existing) {
        execMutation(
            db,
            `UPDATE clansocket_clan_manager_requests
             SET declared_rsn = ?, declared_account_hash = COALESCE(?, declared_account_hash),
                 plugin_verified = MAX(plugin_verified, ?),
                 source = ?, requested_at = ?
             WHERE id = ?`,
            args.declaredRsn.trim(),
            args.declaredAccountHash,
            args.pluginVerified ? 1 : 0,
            args.source,
            now,
            existing.id,
        );
        return getManagerRequestById(existing.id)!;
    }
    const id = randomUUID();
    const clan = getClanById(args.clanId);
    const clanName = clan?.display_name ?? "";
    const clanSlug = clan?.slug ?? "";
    execMutation(
        db,
        `INSERT INTO clansocket_clan_manager_requests (
            id, site_account_id, clan_id, clan_name, clan_slug, declared_rsn, declared_account_hash,
            plugin_verified, source, status, requested_at, resolved_at, resolved_by_site_account_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NULL, NULL)`,
        id,
        args.siteAccountId,
        args.clanId,
        clanName,
        clanSlug,
        args.declaredRsn.trim(),
        args.declaredAccountHash,
        args.pluginVerified ? 1 : 0,
        args.source,
        now,
    );
    return getManagerRequestById(id)!;
}

export function getManagerRequestById(id: string): ManagerRequestRow | null {
    return getOne<ManagerRequestRow>(
        getDb(DB_NAMES.APP),
        `SELECT ${MANAGER_REQUEST_COLUMNS} FROM clansocket_clan_manager_requests WHERE id = ?`,
        id,
    );
}

export function listPendingRequestsForClan(clanId: string): ManagerRequestRow[] {
    return getMany<ManagerRequestRow>(
        getDb(DB_NAMES.APP),
        `SELECT ${MANAGER_REQUEST_COLUMNS}
         FROM clansocket_clan_manager_requests
         WHERE clan_id = ? AND status = 'pending'
         ORDER BY requested_at ASC`,
        clanId,
    );
}

export function resolveManagerRequest(
    id: string,
    status: "approved" | "denied",
    resolvedBySiteAccountId: string,
): ManagerRequestRow | null {
    const changed = runMutation(
        getDb(DB_NAMES.APP),
        `UPDATE clansocket_clan_manager_requests
         SET status = ?, resolved_at = ?, resolved_by_site_account_id = ?
         WHERE id = ? AND status = 'pending'`,
        status,
        Date.now(),
        resolvedBySiteAccountId,
        id,
    );
    if (!changed) return null;
    return getManagerRequestById(id);
}

import { getDb, DB_NAMES } from "../../core/database.js";
import { execMutation, exists, getMany, runMutation } from "../../core/db-helpers.js";
import { recordClanAudit } from "../audit/clan-audit-helpers/record.js";
import { ClanAuditActions } from "../audit/clan-audit-actions.js";
import { getClanById } from "../clan-app-helpers.js";

const CLAN_MANAGER_COLUMNS =
    "site_account_id, clan_id, clan_name, role, granted_via, granted_by_site_account_id, granted_at, revoked_at";

export type ClanManagerRole = "owner" | "manager";
export type ClanManagerGrantedVia = "owner_self" | "transfer" | "approval_2fa" | "in_game_consent";

export interface ClanManagerRow {
    site_account_id: string;
    clan_id: string;
    clan_name: string;
    role: ClanManagerRole;
    granted_via: ClanManagerGrantedVia;
    granted_by_site_account_id: string | null;
    granted_at: number;
    revoked_at: number | null;
}

export function insertClanManager(
    siteAccountId: string,
    clanId: string,
    role: ClanManagerRole,
    grantedVia: ClanManagerGrantedVia,
    grantedBySiteAccountId: string | null,
): void {
    const db = getDb(DB_NAMES.APP);
    const prior = db
        .prepare(`SELECT role FROM clansocket_clan_managers WHERE site_account_id = ? AND clan_id = ?`)
        .get(siteAccountId, clanId) as { role: ClanManagerRole } | undefined;
    const clan = getClanById(clanId);
    const clanName = clan?.display_name ?? "";
    execMutation(
        db,
        `INSERT INTO clansocket_clan_managers (site_account_id, clan_id, clan_name, role, granted_via, granted_by_site_account_id, granted_at, revoked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT(site_account_id, clan_id) DO UPDATE SET
            clan_name = excluded.clan_name,
            role = excluded.role,
            granted_via = excluded.granted_via,
            granted_by_site_account_id = excluded.granted_by_site_account_id,
            granted_at = excluded.granted_at,
            revoked_at = NULL`,
        siteAccountId,
        clanId,
        clanName,
        role,
        grantedVia,
        grantedBySiteAccountId,
        Date.now(),
    );
    recordClanAudit(clanId, {
        actor: grantedBySiteAccountId,
        action: ClanAuditActions.ManagerGranted,
        targetId: siteAccountId,
        payload: { role, grantedVia, priorRole: prior?.role ?? null },
    });
}

export function isClanManager(siteAccountId: string, clanId: string): boolean {
    return exists(
        getDb(DB_NAMES.APP),
        `SELECT 1 FROM clansocket_clan_managers
         WHERE site_account_id = ? AND clan_id = ? AND revoked_at IS NULL LIMIT 1`,
        siteAccountId,
        clanId,
    );
}

export function listClanManagersForAccount(siteAccountId: string): ClanManagerRow[] {
    return getMany<ClanManagerRow>(
        getDb(DB_NAMES.APP),
        `SELECT ${CLAN_MANAGER_COLUMNS}
         FROM clansocket_clan_managers
         WHERE site_account_id = ? AND revoked_at IS NULL
         ORDER BY granted_at DESC`,
        siteAccountId,
    );
}

export function listManagersForClan(clanId: string): ClanManagerRow[] {
    return getMany<ClanManagerRow>(
        getDb(DB_NAMES.APP),
        `SELECT ${CLAN_MANAGER_COLUMNS}
         FROM clansocket_clan_managers
         WHERE clan_id = ? AND revoked_at IS NULL
         ORDER BY granted_at ASC`,
        clanId,
    );
}

export function revokeClanManager(
    siteAccountId: string,
    clanId: string,
    revokedBySiteAccountId: string | null = null,
): boolean {
    const db = getDb(DB_NAMES.APP);
    const prior = db
        .prepare(
            `SELECT role FROM clansocket_clan_managers WHERE site_account_id = ? AND clan_id = ? AND revoked_at IS NULL`,
        )
        .get(siteAccountId, clanId) as { role: ClanManagerRole } | undefined;
    const ok = runMutation(
        db,
        `UPDATE clansocket_clan_managers SET revoked_at = ?
         WHERE site_account_id = ? AND clan_id = ? AND revoked_at IS NULL`,
        Date.now(),
        siteAccountId,
        clanId,
    );
    if (ok) {
        recordClanAudit(clanId, {
            actor: revokedBySiteAccountId,
            action: ClanAuditActions.ManagerRevoked,
            targetId: siteAccountId,
            payload: { priorRole: prior?.role ?? null },
        });
    }
    return ok;
}

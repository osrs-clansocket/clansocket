import { getDb, DB_NAMES, getClanDb } from "../../core/database.js";
import { listAccountHashesForSiteAccount } from "../../site/site-account-helpers/index.js";

export type ClanPosture = "owner" | "manager" | "member";

interface ManagerRoleRow {
    role: "owner" | "manager";
}

function activeManagerRole(siteAccountId: string, clanId: string): "owner" | "manager" | null {
    const row = getDb(DB_NAMES.APP)
        .prepare(
            `SELECT role FROM clansocket_clan_managers
             WHERE site_account_id = ? AND clan_id = ? AND revoked_at IS NULL
             LIMIT 1`,
        )
        .get(siteAccountId, clanId) as ManagerRoleRow | undefined;
    return row?.role ?? null;
}

function hasClanAccountsRow(clanId: string, hashes: readonly string[]): boolean {
    if (hashes.length === 0) return false;
    const ph = hashes.map(() => "?").join(",");
    const row = getClanDb(clanId)
        .prepare(`SELECT 1 FROM clan_accounts WHERE account_hash IN (${ph}) LIMIT 1`)
        .get(...hashes);
    return Boolean(row);
}

function hasCurrentRosterRow(clanId: string, hashes: readonly string[]): boolean {
    if (hashes.length === 0) return false;
    const ph = hashes.map(() => "?").join(",");
    const row = getClanDb(clanId)
        .prepare(`SELECT 1 FROM clan_members WHERE account_hash IN (${ph}) LIMIT 1`)
        .get(...hashes);
    return Boolean(row);
}

type PresenceCheck = (clanId: string, hashes: readonly string[]) => boolean;

function resolvePostureWith(siteAccountId: string, clanId: string, check: PresenceCheck): ClanPosture | null {
    const role = activeManagerRole(siteAccountId, clanId);
    if (role !== null) return role;
    const hashes = listAccountHashesForSiteAccount(siteAccountId);
    if (check(clanId, hashes)) return "member";
    return null;
}

// Resolves the calling user's relation to a clan. Returns null when the user
// has no owner/manager role AND no clan_accounts presence — that user has
// no legitimate read scope here, callers should refuse the query.
//
// All three returned postures map to clan_public + catalog visibility in the
// AI query gate. Distinction is preserved for audit/logging.
export function resolveClanPosture(siteAccountId: string, clanId: string): ClanPosture | null {
    return resolvePostureWith(siteAccountId, clanId, hasClanAccountsRow);
}

// Tighter variant for live-state visibility (positions, current location).
// Membership requires presence in the CURRENT clan_members roster, not historical
// clan_accounts. Ex-members lose visibility automatically when the roster drops
// them. Owner/manager always pass regardless of roster presence.
export function resolveLiveClanPosture(siteAccountId: string, clanId: string): ClanPosture | null {
    return resolvePostureWith(siteAccountId, clanId, hasCurrentRosterRow);
}

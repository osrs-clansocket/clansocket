import { randomUUID } from "node:crypto";
import { getDb, DB_NAMES } from "../../core/database.js";
import { execMutation, exists, getMany, getOne, runMutation } from "../../core/db-helpers.js";
import { getClanById } from "../clan-app-helpers.js";

const CLAN_WHITELIST_COLUMNS =
    "id, clan_id, clan_name, entry_kind, entry_value, label, added_by_site_account_id, added_at, revoked_at";

export type ClanWhitelistKind = "rank";

export interface ClanWhitelistRow {
    id: string;
    clan_id: string;
    clan_name: string;
    entry_kind: ClanWhitelistKind;
    entry_value: string;
    label: string | null;
    added_by_site_account_id: string | null;
    added_at: number;
    revoked_at: number | null;
}

function normalizeRank(rank: string): string {
    return rank.trim();
}

export function addClanWhitelistRank(
    clanId: string,
    rank: string,
    label: string | null,
    addedBySiteAccountId: string,
): ClanWhitelistRow {
    const db = getDb(DB_NAMES.APP);
    const id = randomUUID();
    const value = normalizeRank(rank);
    const now = Date.now();
    const clan = getClanById(clanId);
    const clanName = clan?.display_name ?? "";
    execMutation(
        db,
        `INSERT INTO clansocket_clan_whitelists (id, clan_id, clan_name, entry_kind, entry_value, label, added_by_site_account_id, added_at, revoked_at)
         VALUES (?, ?, ?, 'rank', ?, ?, ?, ?, NULL)
         ON CONFLICT(clan_id, entry_value) WHERE revoked_at IS NULL DO NOTHING`,
        id,
        clanId,
        clanName,
        value,
        label,
        addedBySiteAccountId,
        now,
    );
    return getOne<ClanWhitelistRow>(
        db,
        `SELECT ${CLAN_WHITELIST_COLUMNS}
         FROM clansocket_clan_whitelists
         WHERE clan_id = ? AND entry_value = ? AND revoked_at IS NULL`,
        clanId,
        value,
    )!;
}

export function listClanWhitelist(clanId: string): ClanWhitelistRow[] {
    return getMany<ClanWhitelistRow>(
        getDb(DB_NAMES.APP),
        `SELECT ${CLAN_WHITELIST_COLUMNS}
         FROM clansocket_clan_whitelists
         WHERE clan_id = ? AND revoked_at IS NULL
         ORDER BY added_at ASC`,
        clanId,
    );
}

export function revokeClanWhitelistEntry(entryId: string, clanId: string): boolean {
    return runMutation(
        getDb(DB_NAMES.APP),
        `UPDATE clansocket_clan_whitelists SET revoked_at = ? WHERE id = ? AND clan_id = ? AND revoked_at IS NULL`,
        Date.now(),
        entryId,
        clanId,
    );
}

export function isRankWhitelistedForClan(clanId: string, rank: string): boolean {
    return exists(
        getDb(DB_NAMES.APP),
        `SELECT 1 FROM clansocket_clan_whitelists
         WHERE clan_id = ? AND entry_value = ? AND revoked_at IS NULL LIMIT 1`,
        clanId,
        normalizeRank(rank),
    );
}

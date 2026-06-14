import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DB_NAMES, getDb, getClanDb, listAccountHashesForSiteAccount } from "../database/index.js";
import { clanDirPath } from "../database/core/database.js";

interface RsnHistoryRow {
    rsn: string;
    accountHash: string;
    firstSeen: number;
    lastSeen: number;
}

export interface OwnedRsnWindow {
    rsn: string;
    accountHash: string;
    firstSeen: number;
    lastSeen: number;
}

export interface ClanWindowSet {
    clanId: string;
    windows: OwnedRsnWindow[];
}

export function listAllClanIds(): string[] {
    const db = getDb(DB_NAMES.APP);
    return (db.prepare(`SELECT id FROM clansocket_clans`).all() as { id: string }[]).map((r) => r.id);
}

function resolveRsnWindowsForHashes(hashes: readonly string[]): OwnedRsnWindow[] {
    if (hashes.length === 0) return [];
    const placeholders = hashes.map(() => "?").join(",");
    return getDb(DB_NAMES.APP)
        .prepare(
            `SELECT rsn, account_hash AS accountHash, first_seen AS firstSeen, last_seen AS lastSeen
             FROM clansocket_account_rsns WHERE account_hash IN (${placeholders})`,
        )
        .all(...hashes) as RsnHistoryRow[];
}

export function resolveClanWindows(clanId: string, hashes: readonly string[]): OwnedRsnWindow[] {
    if (!clanDbExists(clanId)) return [];
    return resolveRsnWindowsForHashes(hashes);
}

export function resolveAllClanWindowsFor(siteAccountId: string): ClanWindowSet[] {
    const hashes = listAccountHashesForSiteAccount(siteAccountId);
    if (hashes.length === 0) return [];
    const windows = resolveRsnWindowsForHashes(hashes);
    if (windows.length === 0) return [];
    const out: ClanWindowSet[] = [];
    for (const clanId of listAllClanIds()) {
        if (!clanDbExists(clanId)) continue;
        out.push({ clanId, windows });
    }
    return out;
}

export interface ClanMemberRow {
    member_name: string;
    rank: string | null;
    joined_at: string | null;
    first_observed_at: number;
    last_observed_at: number;
}

export interface RosterDiffRow {
    id: number;
    from_fingerprint: string | null;
    to_fingerprint: string;
    event_type: string;
    member_name: string | null;
    old_value: string | null;
    new_value: string | null;
    detected_at: number;
}

function clanDbExists(clanId: string): boolean {
    return existsSync(resolve(clanDirPath(clanId), "clan.db"));
}

export function selectOwnedClanMembers(clanId: string, windows: OwnedRsnWindow[]): ClanMemberRow[] {
    if (windows.length === 0 || !clanDbExists(clanId)) return [];
    const clanDb = getClanDb(clanId);
    const out: ClanMemberRow[] = [];
    for (const w of windows) {
        const row = clanDb
            .prepare(
                `SELECT member_name, rank, joined_at, first_observed_at, last_observed_at
                 FROM clan_members WHERE member_name = ? AND last_observed_at >= ? AND first_observed_at <= ?`,
            )
            .get(w.rsn, w.firstSeen, w.lastSeen) as ClanMemberRow | undefined;
        if (row) out.push(row);
    }
    return out;
}

export function selectOwnedRosterDiffs(clanId: string, windows: OwnedRsnWindow[]): RosterDiffRow[] {
    if (windows.length === 0 || !clanDbExists(clanId)) return [];
    const clanDb = getClanDb(clanId);
    const out: RosterDiffRow[] = [];
    const seen = new Set<number>();
    for (const w of windows) {
        const rows = clanDb
            .prepare(
                `SELECT id, from_fingerprint, to_fingerprint, event_type, member_name, old_value, new_value, detected_at
                 FROM clan_roster_diffs WHERE member_name = ? AND detected_at BETWEEN ? AND ?`,
            )
            .all(w.rsn, w.firstSeen, w.lastSeen) as RosterDiffRow[];
        for (const row of rows) {
            if (seen.has(row.id)) continue;
            seen.add(row.id);
            out.push(row);
        }
    }
    return out;
}

export function deleteOwnedClanMembers(clanId: string, windows: OwnedRsnWindow[]): number {
    if (windows.length === 0 || !clanDbExists(clanId)) return 0;
    const clanDb = getClanDb(clanId);
    let n = 0;
    for (const w of windows) {
        n += clanDb
            .prepare(
                `DELETE FROM clan_members WHERE member_name = ? AND last_observed_at >= ? AND first_observed_at <= ?`,
            )
            .run(w.rsn, w.firstSeen, w.lastSeen).changes;
    }
    return n;
}

export function deleteOwnedRosterDiffs(clanId: string, windows: OwnedRsnWindow[]): number {
    if (windows.length === 0 || !clanDbExists(clanId)) return 0;
    const clanDb = getClanDb(clanId);
    let n = 0;
    for (const w of windows) {
        n += clanDb
            .prepare(`DELETE FROM clan_roster_diffs WHERE member_name = ? AND detected_at BETWEEN ? AND ?`)
            .run(w.rsn, w.firstSeen, w.lastSeen).changes;
    }
    return n;
}

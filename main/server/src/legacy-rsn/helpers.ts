import {
    DB_NAMES,
    getClanDb,
    getDb,
    listAccountHashesForSiteAccount,
    resolveClanPosture,
    getAccountRsn,
} from "../database/index.js";
import { NAME_CHANGED_SUFFIX } from "../database/plugin/saturated-tables.js";

interface ActiveClanRow {
    id: string;
    slug: string;
    display_name: string;
}

interface OrphanRsnRow {
    sender_rsn: string;
    n: number;
}

export interface MemberClan {
    id: string;
    slug: string;
    displayName: string;
}

export interface LegacyRsnMatch {
    clanId: string;
    clanSlug: string;
    clanDisplayName: string;
    legacyRsn: string;
    matchCount: number;
}

export function listMemberClansForSiteAccount(siteAccountId: string): MemberClan[] {
    const rows = getDb(DB_NAMES.APP)
        .prepare(
            `SELECT id, slug, display_name FROM clansocket_clans
             WHERE status = 'active' AND archived_at IS NULL`,
        )
        .all() as ActiveClanRow[];
    const out: MemberClan[] = [];
    for (const r of rows) {
        if (resolveClanPosture(siteAccountId, r.id) === null) continue;
        out.push({ id: r.id, slug: r.slug, displayName: r.display_name });
    }
    return out;
}

export function listLegacyRsnsForSiteAccount(siteAccountId: string): LegacyRsnMatch[] {
    const out: LegacyRsnMatch[] = [];
    for (const clan of listMemberClansForSiteAccount(siteAccountId)) {
        const rows = getClanDb(clan.id)
            .prepare(
                `SELECT sender_rsn, COUNT(*) AS n FROM clan_chats
                 WHERE sender_rsn IS NOT NULL AND instr(sender_rsn, ?) > 0
                 GROUP BY sender_rsn ORDER BY n DESC`,
            )
            .all(NAME_CHANGED_SUFFIX) as OrphanRsnRow[];
        for (const r of rows) {
            out.push({
                clanId: clan.id,
                clanSlug: clan.slug,
                clanDisplayName: clan.displayName,
                legacyRsn: stripSuffix(r.sender_rsn),
                matchCount: r.n,
            });
        }
    }
    return out;
}

function stripSuffix(rsn: string): string {
    const idx = rsn.indexOf(NAME_CHANGED_SUFFIX);
    return idx > 0 ? rsn.slice(0, idx) : rsn;
}

export interface ClaimResult {
    claimedRows: number;
}

export class LegacyClaimError extends Error {
    constructor(
        public readonly code: string,
        message: string,
    ) {
        super(message);
    }
}

export function claimLegacyRsn(siteAccountId: string, clanSlug: string, legacyRsn: string): ClaimResult {
    const memberClan = listMemberClansForSiteAccount(siteAccountId).find((c) => c.slug === clanSlug);
    if (!memberClan) {
        throw new LegacyClaimError("not_a_member", "You are not a member of that clan.");
    }
    const hashes = listAccountHashesForSiteAccount(siteAccountId);
    if (hashes.length === 0) {
        throw new LegacyClaimError("no_account", "Verify your RSN with the plugin before claiming legacy data.");
    }
    if (hashes.length > 1) {
        throw new LegacyClaimError(
            "multiple_accounts",
            "Multiple OSRS accounts bound. Pick one in your profile before claiming legacy data.",
        );
    }
    const targetHash = hashes[0];
    const verified = getAccountRsn(targetHash);
    if (!verified) {
        throw new LegacyClaimError("no_verified_rsn", "Your RSN is not currently verified.");
    }
    const suffixed = `${legacyRsn}${NAME_CHANGED_SUFFIX}`;
    const result = getClanDb(memberClan.id)
        .prepare(
            `UPDATE clan_chats
             SET sender_rsn = ?, account_hash = ?
             WHERE LOWER(sender_rsn) = LOWER(?)`,
        )
        .run(verified.rsn, targetHash, suffixed);
    return { claimedRows: result.changes };
}

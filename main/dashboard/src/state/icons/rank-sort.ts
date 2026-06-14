import { clansClient, type ClanTitleLadderEntry } from "../clans/clans-client/index.js";

export type ClanRankLadder = readonly ClanTitleLadderEntry[];

const ladderCache = new Map<string, Promise<ClanRankLadder>>();

export function fetchClanRankLadder(slug: string): Promise<ClanRankLadder> {
    const existing = ladderCache.get(slug);
    if (existing !== undefined) return existing;
    const promise = clansClient.listClanTitles(slug).then((entries) => entries as ClanRankLadder);
    ladderCache.set(slug, promise);
    return promise;
}

export function invalidateClanRankLadder(slug: string): void {
    ladderCache.delete(slug);
}

export function rankValueByTitle(ladder: ClanRankLadder): Map<string, number> {
    const out = new Map<string, number>();
    for (const t of ladder) out.set(t.title, t.rank);
    return out;
}

export type Comparator<T> = (a: T, b: T) => number;

function alphabeticalRankCompare(a: string, b: string): number {
    return a.localeCompare(b);
}

export function compareRanksByHierarchy(
    a: string,
    b: string,
    rankByTitle: Map<string, number>,
    fallback: Comparator<string> = alphabeticalRankCompare,
): number {
    const ra = rankByTitle.get(a);
    const rb = rankByTitle.get(b);
    if (ra !== undefined && rb !== undefined) return rb - ra;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return fallback(a, b);
}

export function sortRanksByHierarchy(
    ranks: readonly string[],
    ladder: ClanRankLadder,
    fallback?: Comparator<string>,
): string[] {
    const map = rankValueByTitle(ladder);
    return [...ranks].sort((a, b) => compareRanksByHierarchy(a, b, map, fallback));
}

export interface MemberLike {
    rank: string | null;
}

export function sortMembersByHierarchy<T extends MemberLike>(
    members: readonly T[],
    ladder: ClanRankLadder,
    nameKey: (m: T) => string,
): T[] {
    const map = rankValueByTitle(ladder);
    return [...members].sort((a, b) => {
        const ra = a.rank ?? "";
        const rb = b.rank ?? "";
        const cmp = compareRanksByHierarchy(ra, rb, map);
        if (cmp !== 0) return cmp;
        return nameKey(a).localeCompare(nameKey(b));
    });
}

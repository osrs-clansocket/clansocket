import { identityClient } from "../../identity/identity-client/index.js";
import { readJsonOrFallback } from "../../fetch-result.js";
import { sameOriginFetch } from "../../../shared/helpers/fetch-helper.js";
import type { ClanIconKind, IconTransform } from "./branding.js";

export interface ClanRosterMember {
    name: string;
    rank: string | null;
    joinedAt: string | null;
    hasPlugin?: boolean;
    isLive?: boolean;
}

export interface ManagedClanRoster {
    fingerprint: string;
    capturedAt: number;
    memberCount: number;
    members: ClanRosterMember[];
}

export interface ManagedClan {
    id: string;
    slug: string;
    displayName: string;
    status: string;
    role: string;
    grantedVia: string;
    grantedAt: number;
    createdAt: number;
    iconKind: ClanIconKind | null;
    iconValue: string | null;
    iconCustomized: boolean;
    iconTransform: IconTransform | null;
    iconVersion: number;
    color: string | null;
    roster: ManagedClanRoster | null;
}

export interface ClanSummary {
    id: string;
    slug: string;
    displayName: string;
    status: string;
    ownerAccountHash: string | null;
    createdAt: number;
    claimedAt: number | null;
    roster: {
        fingerprint: string;
        capturedAt: number;
        memberCount: number;
        members: ClanRosterMember[];
    } | null;
}

export interface ClanSearchHit {
    slug: string;
    displayName: string;
    iconKind: "builtin" | "image" | null;
    iconValue: string | null;
    color: string | null;
}

export interface ManagerStatus {
    isManager: boolean;
    clanId: string | null;
    slug: string;
}

export interface ClanTitleLadderEntry {
    rank: number;
    title: string;
    titleId: number;
}

export async function listManaged(): Promise<ManagedClan[]> {
    const res = await identityClient.authedFetch("/api/clans/me");
    const body = await readJsonOrFallback<{ clans?: ManagedClan[] }>(res, {});
    return body.clans ?? [];
}

export async function getClan(slug: string): Promise<ClanSummary | null> {
    const res = await sameOriginFetch(`/api/clans/${encodeURIComponent(slug)}`);
    return readJsonOrFallback<ClanSummary | null>(res, null);
}

export async function checkClanManagerStatus(slug: string): Promise<ManagerStatus> {
    const res = await identityClient.authedFetch(`/api/clans/${encodeURIComponent(slug)}/manage/me`);
    return readJsonOrFallback<ManagerStatus>(res, { isManager: false, clanId: null, slug });
}

export async function searchClans(query: string): Promise<ClanSearchHit[]> {
    const res = await identityClient.authedFetch(`/api/clans/search?q=${encodeURIComponent(query)}`, {
        method: "GET",
    });
    if (!res.ok) return [];
    const body = (await res.json().catch(() => ({}))) as { clans?: ClanSearchHit[] };
    return body.clans ?? [];
}

export async function listClanTitles(slug: string): Promise<ClanTitleLadderEntry[]> {
    const res = await sameOriginFetch(`/api/clans/${encodeURIComponent(slug)}/clan-titles`);
    const body = await readJsonOrFallback<{ entries?: ClanTitleLadderEntry[] }>(res, {});
    return body.entries ?? [];
}

export async function removeClan(slug: string): Promise<boolean> {
    const res = await identityClient.authedFetch(`/api/clans/${encodeURIComponent(slug)}`, { method: "DELETE" });
    return res.ok;
}

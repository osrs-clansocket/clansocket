import { sameOriginFetch } from "../../../shared/helpers/fetch-helper.js";

export type WomVerifyStatus = "ok" | "auth-failed" | "rate-limited" | "unreachable";

export interface WomPublicMetadata {
    groupId: number;
    groupName: string;
}

export interface WomLinkedStatus {
    linked: true;
    linker_site_account_id: string;
    linker_rsn: string | null;
    linker_rank: string | null;
    wom_group_id: number;
    cached_group_name: string;
    last_verified_at: number | null;
    last_verified_status: WomVerifyStatus | null;
    last_backfill_at: number | null;
    last_backfill_status: string | null;
    next_backfill_eligible_at: number | null;
}

export interface WomUnlinkedStatus {
    linked: false;
}

export type WomStatus = WomLinkedStatus | WomUnlinkedStatus;

export interface WomVerifyPayload {
    groupId: number;
    verificationCode: string;
    apiKey?: string;
    userAgent?: string;
}

export interface WomVerifyResult {
    ok: boolean;
    public_metadata?: WomPublicMetadata;
    reason?: string;
}

export interface WomLinkResult {
    ok: boolean;
    linked?: { group_id: number; group_name: string; linker_site_account_id: string };
    reason?: string;
}

export interface WomReassignResult {
    ok: boolean;
    new_linker?: { user_id: string; display_name: string };
    reason?: string;
}

export interface WomSyncNowResult {
    ok: boolean;
    reason?: string;
    next_eligible_at?: number;
    enqueued?: number;
}

export interface WomGroupPlayer {
    id: number;
    username: string;
    displayName: string;
    type: string;
    country: string | null;
    exp: number;
    ehp: number;
    ehb: number;
    ttm: number;
    updatedAt: string;
}

export interface WomGroupMembership {
    playerId: number;
    role: string | null;
    createdAt: string;
    updatedAt: string;
    player: WomGroupPlayer;
}

export interface WomGroupDetails {
    id: number;
    name: string;
    clanChat: string;
    description: string | null;
    homeworld: number | null;
    verified: boolean;
    patron: boolean;
    score: number;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
    memberships: WomGroupMembership[];
}

interface ServerPayload {
    group_id: number;
    verification_code: string;
    api_key?: string;
    user_agent?: string;
}

function baseUrl(slug: string): string {
    return `/api/wom/${encodeURIComponent(slug)}`;
}

function toServerPayload(p: WomVerifyPayload): ServerPayload {
    const out: ServerPayload = { group_id: p.groupId, verification_code: p.verificationCode };
    if (p.apiKey !== undefined && p.apiKey.length > 0) out.api_key = p.apiKey;
    if (p.userAgent !== undefined && p.userAgent.length > 0) out.user_agent = p.userAgent;
    return out;
}

export async function verifyWom(slug: string, payload: WomVerifyPayload): Promise<WomVerifyResult> {
    const res = await sameOriginFetch(`${baseUrl(slug)}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toServerPayload(payload)),
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return (await res.json()) as WomVerifyResult;
}

export async function linkWom(slug: string, payload: WomVerifyPayload): Promise<WomLinkResult> {
    const res = await sameOriginFetch(baseUrl(slug), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toServerPayload(payload)),
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return (await res.json()) as WomLinkResult;
}

export async function revokeWom(slug: string): Promise<{ ok: boolean; reason?: string }> {
    const res = await sameOriginFetch(baseUrl(slug), { method: "DELETE" });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return (await res.json()) as { ok: boolean };
}

export async function reassignWomLinker(
    slug: string,
    payload: { newLinkerUserId: string },
): Promise<WomReassignResult> {
    const res = await sameOriginFetch(`${baseUrl(slug)}/reassign-linker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_linker_user_id: payload.newLinkerUserId }),
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return (await res.json()) as WomReassignResult;
}

export async function syncWomNow(slug: string): Promise<WomSyncNowResult> {
    const res = await sameOriginFetch(`${baseUrl(slug)}/sync-now`, { method: "POST" });
    if (!res.ok && res.status !== 409) return { ok: false, reason: `http_${res.status}` };
    return (await res.json()) as WomSyncNowResult;
}

export async function updateWomNow(slug: string): Promise<{ ok: boolean; reason?: string }> {
    const res = await sameOriginFetch(`${baseUrl(slug)}/update-now`, { method: "POST" });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return (await res.json()) as { ok: boolean };
}

export async function getWomStatus(slug: string): Promise<WomStatus> {
    const res = await sameOriginFetch(baseUrl(slug), { method: "GET" });
    if (!res.ok) return { linked: false };
    return (await res.json()) as WomStatus;
}

export async function getWomGroupDetails(slug: string): Promise<WomGroupDetails | null> {
    const res = await sameOriginFetch(`${baseUrl(slug)}/details`, { method: "GET" });
    if (!res.ok) return null;
    return (await res.json()) as WomGroupDetails;
}

export function openWomStream(slug: string, onMessage: () => void): () => void {
    const url = `${baseUrl(slug)}/stream`;
    const source = new EventSource(url, { withCredentials: true });
    source.addEventListener("wom", () => onMessage());
    source.addEventListener("error", () => {
        // EventSource auto-reconnects; the listener stays attached
    });
    return () => source.close();
}

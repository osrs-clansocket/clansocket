import { identityClient } from "../../../identity/identity-client/index.js";
import { readJsonOrFallback } from "../../../fetch-result.js";
import type { ClanManagerRow, ManagerRequest } from "./types.js";

export async function listManagerRequests(slug: string): Promise<ManagerRequest[]> {
    const res = await identityClient.authedFetch(`/api/clans/${encodeURIComponent(slug)}/manager-requests`);
    const body = await readJsonOrFallback<{ requests?: ManagerRequest[] }>(res, {});
    return body.requests ?? [];
}

export async function approveManagerRequest(slug: string, id: string): Promise<boolean> {
    const res = await identityClient.authedFetch(
        `/api/clans/${encodeURIComponent(slug)}/manager-requests/${encodeURIComponent(id)}/approve`,
        { method: "POST" },
    );
    return res.ok;
}

export async function denyManagerRequest(slug: string, id: string): Promise<boolean> {
    const res = await identityClient.authedFetch(
        `/api/clans/${encodeURIComponent(slug)}/manager-requests/${encodeURIComponent(id)}/deny`,
        { method: "POST" },
    );
    return res.ok;
}

export async function listClanManagers(slug: string): Promise<ClanManagerRow[]> {
    const res = await identityClient.authedFetch(`/api/clans/${encodeURIComponent(slug)}/managers`);
    const body = await readJsonOrFallback<{ managers?: ClanManagerRow[] }>(res, {});
    return body.managers ?? [];
}

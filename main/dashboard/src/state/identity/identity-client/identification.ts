import { readJsonOrFallback } from "../../fetch-result.js";
import { authedFetch, okResult } from "./fetch-helpers.js";
import type { Identification, OkResult, PendingRsnRequest } from "./types.js";

export async function getIdentification(): Promise<Identification | null> {
    const res = await authedFetch("/api/data-rights/me/identification", { method: "GET" });
    return readJsonOrFallback<Identification | null>(res, null);
}

export async function requestRsn(
    rsn: string,
): Promise<{ ok: true; request: PendingRsnRequest } | { ok: false; error: string; message?: string }> {
    const res = await authedFetch("/api/data-rights/me/rsn/request", {
        method: "POST",
        body: JSON.stringify({ rsn }),
    });
    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        return { ok: false, error: body.error ?? `error ${res.status}`, message: body.message };
    }
    return { ok: true, request: (await res.json()) as PendingRsnRequest };
}

export async function cancelRsnRequest(id: number): Promise<OkResult> {
    return okResult(
        await authedFetch(`/api/data-rights/me/rsn/request/${id}`, { method: "DELETE" }),
        async () => undefined,
    );
}

export async function removeRsnBinding(accountHash: string): Promise<OkResult> {
    return okResult(
        await authedFetch(`/api/data-rights/me/rsn/${encodeURIComponent(accountHash)}`, { method: "DELETE" }),
        async () => undefined,
    );
}

import { subscribeIdentificationMux } from "../../data-rights/data-rights-client/streams/stream-mux.js";

export function openIdentificationStream(onEvent: () => void): () => void {
    return subscribeIdentificationMux(onEvent);
}

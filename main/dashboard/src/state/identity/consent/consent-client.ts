import { readJsonOrFallback } from "../../fetch-result.js";
import { sameOriginFetch } from "../../../shared/helpers/fetch-helper.js";

export type ConsentKind = "rsn" | "claim" | "manager";
export type ConsentStatus = "pending" | "confirmed" | "rejected" | "expired" | "cancelled";

export interface ConsentRecord {
    id: number;
    kind: ConsentKind;
    targetRsn: string;
    declaredClanName: string | null;
    declaredClanSlug: string | null;
    status: ConsentStatus;
    createdAt: number;
    expiresAt: number;
    resolvedAt: number | null;
}

type OkResult = { ok: true } | { ok: false; error: string };

async function readError(res: Response): Promise<string> {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return body.error ?? `error ${res.status}`;
}

async function listConsents(): Promise<ConsentRecord[]> {
    const res = await sameOriginFetch("/api/auth/site/consents");
    const body = await readJsonOrFallback<{ consents: ConsentRecord[] }>(res, { consents: [] });
    return body.consents;
}

async function cancelNonRsnConsent(id: number): Promise<OkResult> {
    const res = await sameOriginFetch(`/api/auth/site/consents/${id}`, {
        method: "DELETE",
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: await readError(res) };
}

export const consentClient = {
    listConsents,
    cancelNonRsnConsent,
};

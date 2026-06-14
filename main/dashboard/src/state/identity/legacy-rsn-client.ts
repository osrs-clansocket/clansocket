import { readJsonOrFallback } from "../fetch-result.js";
import { sameOriginFetch } from "../../shared/helpers/fetch-helper.js";

export interface LegacyRsnMatch {
    clanId: string;
    clanSlug: string;
    clanDisplayName: string;
    legacyRsn: string;
    matchCount: number;
}

type ClaimResult = { ok: true; claimedRows: number } | { ok: false; error: string; message?: string };

async function readError(res: Response): Promise<{ error: string; message?: string }> {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    return { error: body.error ?? `error ${res.status}`, message: body.message };
}

async function listMatches(): Promise<LegacyRsnMatch[]> {
    const res = await sameOriginFetch("/api/me/legacy-rsns");
    const body = await readJsonOrFallback<{ matches: LegacyRsnMatch[] }>(res, { matches: [] });
    return body.matches;
}

async function claim(clanSlug: string, legacyRsn: string): Promise<ClaimResult> {
    const res = await sameOriginFetch("/api/me/legacy-rsns/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clanSlug, legacyRsn }),
    });
    if (res.ok) {
        const body = (await res.json()) as { claimedRows: number };
        return { ok: true, claimedRows: body.claimedRows };
    }
    const err = await readError(res);
    return { ok: false, error: err.error, message: err.message };
}

export const legacyRsnClient = {
    listMatches,
    claim,
};

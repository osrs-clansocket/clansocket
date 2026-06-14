import { identityClient } from "../../identity/identity-client/index.js";
import { readJsonOrFallback } from "../../fetch-result.js";
import type { DataRightsError, UserDataStats } from "./types.js";

export interface DataExport {
    blob: Blob;
    filename: string;
}

export type ExportResult = ({ ok: true } & DataExport) | ({ ok: false } & DataRightsError);

function stripQuotes(s: string): string {
    let out = s;
    while (out.startsWith('"')) out = out.slice(1);
    while (out.endsWith('"')) out = out.slice(0, -1);
    return out;
}

async function readExportFromResponse(res: Response, defaultFilename: string): Promise<DataExport> {
    const cd = res.headers.get("content-disposition") ?? "";
    const match = cd.indexOf("filename=");
    let filename = defaultFilename;
    if (match >= 0) {
        const tail = stripQuotes(cd.slice(match + "filename=".length));
        if (tail.length > 0) filename = tail;
    }
    const blob = await res.blob();
    return { blob, filename };
}

async function withDataRightsResponse<T>(
    res: Response,
    onSuccess: () => Promise<T>,
): Promise<T | ({ ok: false } & DataRightsError)> {
    if (res.ok) return onSuccess();
    const err = (await res.json().catch(() => ({}))) as DataRightsError;
    return { ok: false, reason: err.reason ?? "failed", message: err.message, retryAfterMs: err.retryAfterMs };
}

export async function getMyDataStats(): Promise<UserDataStats | null> {
    const res = await identityClient.authedFetch("/api/data-rights/me/stats", { method: "GET" });
    return readJsonOrFallback<UserDataStats | null>(res, null);
}

export async function exportMyData(): Promise<ExportResult> {
    const res = await identityClient.authedFetch("/api/data-rights/me/export", { method: "GET" });
    return withDataRightsResponse(res, async () => {
        const exp = await readExportFromResponse(res, "clansocket-user-export.zip");
        return { ok: true, ...exp } as const;
    });
}

export async function deleteMyData(): Promise<{ ok: true } | ({ ok: false } & DataRightsError)> {
    const res = await identityClient.authedFetch("/api/data-rights/me/delete", { method: "POST" });
    return withDataRightsResponse(res, async () => ({ ok: true }) as const);
}

export async function exportClanData(slug: string): Promise<ExportResult> {
    const res = await identityClient.authedFetch(`/api/data-rights/clan/${encodeURIComponent(slug)}/export`, {
        method: "GET",
    });
    return withDataRightsResponse(res, async () => {
        const exp = await readExportFromResponse(res, `clansocket-clan-${slug}.zip`);
        return { ok: true, ...exp } as const;
    });
}

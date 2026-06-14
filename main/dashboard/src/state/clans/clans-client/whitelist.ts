import { identityClient } from "../../identity/identity-client/index.js";
import { readJsonOrFallback } from "../../fetch-result.js";

export type WhitelistKind = "rank";

export interface WhitelistEntry {
    id: string;
    kind: WhitelistKind;
    value: string;
    label: string | null;
    addedBySiteAccountId: string | null;
    addedAt: number;
}

export async function listWhitelist(slug: string): Promise<WhitelistEntry[]> {
    const res = await identityClient.authedFetch(`/api/clans/${encodeURIComponent(slug)}/whitelist`);
    const body = await readJsonOrFallback<{ entries?: WhitelistEntry[] }>(res, {});
    return body.entries ?? [];
}

export async function addWhitelistRank(
    slug: string,
    rank: string,
    label: string | null = null,
): Promise<WhitelistEntry | null> {
    const res = await identityClient.authedFetch(`/api/clans/${encodeURIComponent(slug)}/whitelist/rank`, {
        method: "POST",
        body: JSON.stringify({ rank, label }),
    });
    return readJsonOrFallback<WhitelistEntry | null>(res, null);
}

export async function revokeWhitelistEntry(slug: string, entryId: string): Promise<boolean> {
    const res = await identityClient.authedFetch(
        `/api/clans/${encodeURIComponent(slug)}/whitelist/${encodeURIComponent(entryId)}`,
        { method: "DELETE" },
    );
    return res.ok;
}

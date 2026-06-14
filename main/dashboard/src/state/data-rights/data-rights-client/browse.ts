import { readJsonOrFallback } from "../../fetch-result.js";
import { sameOriginFetch } from "../../../shared/helpers/fetch-helper.js";
import type { BrowseResponse, DeleteResponse, Scope, ScopeListItem } from "./types.js";

async function postJson<T>(path: string, body: unknown): Promise<T | null> {
    const res = await sameOriginFetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    return readJsonOrFallback<T | null>(res, null);
}

export async function listScopes(): Promise<ScopeListItem[]> {
    const res = await sameOriginFetch("/api/data-rights/me/scopes");
    const body = await readJsonOrFallback<{ scopes: ScopeListItem[] }>(res, { scopes: [] });
    return body.scopes;
}

export interface BrowseOpts {
    scope: Scope;
    table: string;
    from?: number;
    to?: number;
    limit?: number;
    offset?: number;
}

export async function browse({
    scope,
    table,
    from,
    to,
    limit = 50,
    offset = 0,
}: BrowseOpts): Promise<BrowseResponse | null> {
    return postJson<BrowseResponse>("/api/data-rights/browse", { scope, table, from, to, limit, offset });
}

export async function deleteRow(
    scope: Scope,
    table: string,
    row: Record<string, unknown>,
): Promise<DeleteResponse | null> {
    return postJson<DeleteResponse>("/api/data-rights/delete", { scope, table, row });
}

export async function deleteRange(
    scope: Scope,
    table: string,
    from: number,
    to: number,
): Promise<DeleteResponse | null> {
    return postJson<DeleteResponse>("/api/data-rights/delete", { scope, table, filter: { from, to } });
}

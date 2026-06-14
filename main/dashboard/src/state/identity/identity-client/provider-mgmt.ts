import { readJsonOrFallback } from "../../fetch-result.js";
import { authedFetch, readError } from "./fetch-helpers.js";
import type { LinkedProvider } from "./types.js";

export async function listProviders(): Promise<{ providers: LinkedProvider[] }> {
    const res = await authedFetch("/api/auth/site/providers", { method: "GET" });
    return readJsonOrFallback<{ providers: LinkedProvider[] }>(res, { providers: [] });
}

export async function unlinkProvider(
    provider: "github" | "discord",
): Promise<{ ok: true } | { ok: false; error: string }> {
    const res = await authedFetch(`/api/auth/site/providers/${provider}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: await readError(res) };
    return { ok: true };
}

export async function updateDisplayName(
    displayName: string,
): Promise<{ ok: true; displayName: string } | { ok: false; error: string }> {
    const res = await authedFetch("/api/auth/site/account/display-name", {
        method: "PATCH",
        body: JSON.stringify({ displayName }),
    });
    if (!res.ok) return { ok: false, error: await readError(res) };
    return (await res.json()) as { ok: true; displayName: string };
}

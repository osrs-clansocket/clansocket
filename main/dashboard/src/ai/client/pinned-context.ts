import { identityClient } from "../../state/identity/identity-client/index.js";

interface ContextResponse {
    pinned: string[];
}

async function fetchPinnedContext(): Promise<string[]> {
    const res = await identityClient.authedFetch("/api/ai/chat/context");
    if (!res.ok) return [];
    const body = (await res.json()) as ContextResponse;
    return body.pinned;
}

async function unpinContextIds(ids: string[]): Promise<string[]> {
    const res = await identityClient.authedFetch("/api/ai/chat/context/unpin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as ContextResponse;
    return body.pinned;
}

export { fetchPinnedContext, unpinContextIds };

import { signal } from "../../dom/factory";
import { identityClient } from "../../state/identity/identity-client/index.js";
import { readJsonThenOkOrThrow } from "../../state/fetch-result.js";

interface DefaultsResponse {
    defaults: Record<string, string>;
}

const data = signal<Record<string, string>>({});
let loaded = false;
let inflight: Promise<void> | null = null;

async function fetchDefaults(): Promise<void> {
    const res = await identityClient.authedFetch("/api/ai/persona/defaults");
    const body = await readJsonThenOkOrThrow<DefaultsResponse>(res, "HTTP");
    data.set(body.defaults);
    loaded = true;
}

export function ensureDefaultsLoaded(): Promise<void> {
    if (loaded) return Promise.resolve();
    if (!inflight)
        inflight = fetchDefaults().catch((err) => {
            inflight = null;
            throw err;
        });
    return inflight;
}

export function defaultValueOf(key: string): string {
    return data()[key] ?? "";
}

export const defaults$ = data;

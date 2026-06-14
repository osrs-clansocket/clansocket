import { identityClient } from "../../identity/identity-client/index.js";
import { PASSKEY_ERR, type PasskeyError } from "./types.js";

async function request<T>(method: string, path: string, body?: unknown): Promise<T | PasskeyError> {
    const init: RequestInit = { method };
    if (body !== undefined) init.body = JSON.stringify(body ?? {});
    const res = await identityClient.authedFetch(path, init);
    if (!res.ok) return (await res.json().catch(() => ({ error: PASSKEY_ERR.requestFailed }))) as PasskeyError;
    return (await res.json()) as T;
}

export async function postJSON<T>(path: string, body: unknown): Promise<T | PasskeyError> {
    return request<T>("POST", path, body);
}

export async function getJSON<T>(path: string): Promise<T | PasskeyError> {
    return request<T>("GET", path);
}

export async function deleteRequest<T>(path: string): Promise<T | PasskeyError> {
    return request<T>("DELETE", path);
}

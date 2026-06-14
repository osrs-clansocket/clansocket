import { identityClient } from "../identity/identity-client/index.js";
import { readJsonOrFallback } from "../fetch-result.js";

export interface AppNotification {
    id: number;
    kind: string;
    title: string;
    body: string;
    href: string | null;
    createdAt: number;
}

async function list(): Promise<AppNotification[]> {
    const res = await identityClient.authedFetch("/api/me/notifications", { method: "GET" });
    const data = await readJsonOrFallback<{ notifications?: AppNotification[] }>(res, {});
    return data.notifications ?? [];
}

async function dismiss(id: number): Promise<boolean> {
    const res = await identityClient.authedFetch(`/api/me/notifications/${id}/dismiss`, { method: "POST" });
    return res.ok;
}

export const notificationsClient = { list, dismiss };

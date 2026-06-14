import { identityClient } from "../../../identity/identity-client/index.js";
import type { ManagerSubmitResult } from "./types.js";

export async function requestTransfer(
    slug: string,
): Promise<{ ok: true; slug: string; clanId: string } | { ok: false; reason: string; message?: string }> {
    const res = await identityClient.authedFetch(`/api/clans/${encodeURIComponent(slug)}/transfer-request`, {
        method: "POST",
    });
    const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        slug?: string;
        clanId?: string;
        reason?: string;
        message?: string;
    };
    if (res.ok && body.ok && body.slug && body.clanId) {
        return { ok: true, slug: body.slug, clanId: body.clanId };
    }
    return { ok: false, reason: body.reason ?? "generic", message: body.message };
}

export async function requestManagement(clanSlug: string, declaredRsn?: string): Promise<ManagerSubmitResult> {
    const res = await identityClient.authedFetch("/api/auth/site/request-management", {
        method: "POST",
        body: JSON.stringify({ clanSlug, declaredRsn }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok && body.ok === true) {
        if (body.alreadyManager === true) {
            return {
                ok: true,
                alreadyManager: true,
                slug: body.slug as string | undefined,
                clanId: body.clanId as string | undefined,
            };
        }
        if (body.status === "granted") {
            return {
                ok: true,
                status: "granted",
                slug: body.slug as string,
                clanId: body.clanId as string,
                rsn: body.rsn as string,
                rank: body.rank as string,
                message: body.message as string,
            };
        }
        return {
            ok: true,
            status: "awaiting-owner-approval",
            requestId: body.requestId as string,
            slug: body.slug as string,
            clanId: body.clanId as string,
            next: body.next as string | undefined,
        };
    }
    return {
        ok: false,
        reason: (body.reason as "bad_payload" | "clan_not_found" | "generic") ?? "generic",
        message: body.message as string | undefined,
    };
}

import { identityClient } from "../../../identity/identity-client/index.js";
import type { ClaimSubmitResult } from "./types.js";

export async function createClaim(rsn: string): Promise<ClaimSubmitResult> {
    const res = await identityClient.authedFetch("/api/auth/site/claims", {
        method: "POST",
        body: JSON.stringify({ rsn }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok && body.ok === true) {
        return {
            ok: true,
            status: "awaiting-plugin-consent",
            requestId: body.requestId as number,
            expiresAt: body.expiresAt as number,
            liveSessions: (body.liveSessions as number) ?? 0,
            clanName: (body.clanName as string) ?? "",
            message: body.message as string | undefined,
        };
    }
    return {
        ok: false,
        reason:
            (body.reason as ClaimSubmitResult & { ok: false } extends infer T
                ? T extends { reason: infer R }
                    ? R
                    : never
                : never) ?? "generic",
        requestId: body.requestId as number | undefined,
        expiresAt: body.expiresAt as number | undefined,
        clanName: body.clanName as string | undefined,
        message: body.message as string | undefined,
    } as ClaimSubmitResult;
}

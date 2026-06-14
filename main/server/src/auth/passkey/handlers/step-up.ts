import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_UNAUTHORIZED } from "../../../shared/http/http-status.js";
import { Router, type Request, type Response, type NextFunction } from "express";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { MS_PER_MINUTE } from "../../../shared/time.js";
import { COOKIE_SITE_SESSION } from "../../oauth-providers.js";
import { readCookie } from "../../site-routes/oauth-helpers.js";
import { requireSiteAccount } from "../../site-middleware.js";
import { verifySiteSession } from "../../site-session.js";
import { challengeOf, consumeChallenge, startChallenge } from "../challenge-helpers.js";
import {
    countPasskeysForAccount,
    findPasskeyByCredentialId,
    listPasskeysForAccount,
    passkeyCredential,
    updatePasskeyAfterAuth,
} from "../passkey-helpers.js";
import { listProvidersForAccount } from "../../../database/site/site-account-helpers/index.js";
import { expectedOrigin, rpId } from "./config.js";

export const STEP_UP_TTL_MS = 5 * MS_PER_MINUTE;
const freshAuthMap = new Map<string, number>();

export function markFreshAuth(sessionId: string): void {
    freshAuthMap.set(sessionId, Date.now());
}

export function isFreshAuth(sessionId: string, maxAgeMs: number = STEP_UP_TTL_MS): boolean {
    const at = freshAuthMap.get(sessionId);
    if (at === undefined) return false;
    if (Date.now() - at > maxAgeMs) {
        freshAuthMap.delete(sessionId);
        return false;
    }
    return true;
}

export function clearFreshAuth(sessionId: string): void {
    freshAuthMap.delete(sessionId);
}

function sessionCookie(req: Request): string | undefined {
    return readCookie(req, COOKIE_SITE_SESSION);
}

export function requireRecentAuth(req: Request, res: Response, next: NextFunction): void {
    const siteAccountId = req.siteAccountId!;
    if (countPasskeysForAccount(siteAccountId) === 0) {
        next();
        return;
    }
    if (listProvidersForAccount(siteAccountId).length > 0) {
        next();
        return;
    }
    const sessionId = sessionCookie(req);
    if (sessionId !== undefined && isFreshAuth(sessionId)) {
        next();
        return;
    }
    res.status(HTTP_FORBIDDEN).json({
        error: "step_up_required",
        message: "Re-authenticate with ur passkey to confirm this action.",
    });
}

const router = Router();

router.post("/step-up/options", requireSiteAccount, async (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const passkeys = listPasskeysForAccount(siteAccountId);
    const options = await generateAuthenticationOptions({
        rpID: rpId(req),
        userVerification: "required",
        allowCredentials: passkeys.map((p) => ({ id: p.credential_id })),
    });
    startChallenge(options.challenge, "authenticate", siteAccountId);
    res.json(options);
});

async function runStepUpVerify(
    req: Request,
    siteAccountId: string,
    response: AuthenticationResponseJSON,
): Promise<{ status: number; error?: string }> {
    const ctx = consumeChallenge(challengeOf(response), "authenticate");
    if (!ctx) return { status: HTTP_UNAUTHORIZED, error: "challenge_invalid" };
    const passkey = findPasskeyByCredentialId(response.id);
    if (!passkey || passkey.site_account_id !== siteAccountId) {
        return { status: HTTP_UNAUTHORIZED, error: "credential_unknown" };
    }
    const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: ctx.challenge,
        expectedOrigin: expectedOrigin(req),
        expectedRPID: rpId(req),
        credential: passkeyCredential(passkey),
    });
    if (!verification.verified) return { status: HTTP_UNAUTHORIZED, error: "verification_failed" };
    updatePasskeyAfterAuth(passkey.id, verification.authenticationInfo.newCounter);
    const sessionId = sessionCookie(req);
    if (sessionId !== undefined && verifySiteSession(sessionId)) markFreshAuth(sessionId);
    return { status: 200 };
}

router.post("/step-up/verify", requireSiteAccount, async (req: Request, res: Response) => {
    const body = req.body as { response?: AuthenticationResponseJSON };
    if (!body.response) {
        res.status(HTTP_BAD_REQUEST).json({ error: "response_required" });
        return;
    }
    const out = await runStepUpVerify(req, req.siteAccountId!, body.response);
    if (out.error) {
        res.status(out.status).json({ error: out.error });
        return;
    }
    res.json({ ok: true });
});

export default router;

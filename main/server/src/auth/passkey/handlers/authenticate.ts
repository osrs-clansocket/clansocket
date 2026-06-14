import { HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED } from "../../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { DB_NAMES, getDb } from "../../../database/index.js";
import { MS_PER_MINUTE } from "../../../shared/time.js";
import { challengeOf, consumeChallenge, startChallenge } from "../challenge-helpers.js";
import { findPasskeyByCredentialId, passkeyCredential, updatePasskeyAfterAuth } from "../passkey-helpers.js";
import { expectedOrigin, issueSession, rpId } from "./config.js";
import { markFreshAuth } from "./step-up.js";

const router = Router();

const authRateLimit = rateLimit({
    windowMs: MS_PER_MINUTE,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "rate_limit", message: "Rate limit hit — wait before retrying." },
});

router.post("/authenticate/options", authRateLimit, async (req: Request, res: Response) => {
    const options = await generateAuthenticationOptions({ rpID: rpId(req), userVerification: "preferred" });
    startChallenge(options.challenge, "authenticate");
    res.json(options);
});

async function runAuthVerify(
    req: Request,
    response: AuthenticationResponseJSON,
): Promise<{ siteAccountId: string } | { error: string; status: number }> {
    const ctx = consumeChallenge(challengeOf(response), "authenticate");
    if (!ctx) return { error: "challenge_invalid", status: HTTP_UNAUTHORIZED };
    const passkey = findPasskeyByCredentialId(response.id);
    if (!passkey) return { error: "credential_unknown", status: HTTP_UNAUTHORIZED };
    const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: ctx.challenge,
        expectedOrigin: expectedOrigin(req),
        expectedRPID: rpId(req),
        credential: passkeyCredential(passkey),
    });
    if (!verification.verified) return { error: "verification_failed", status: HTTP_UNAUTHORIZED };
    updatePasskeyAfterAuth(passkey.id, verification.authenticationInfo.newCounter);
    getDb(DB_NAMES.APP)
        .prepare(`UPDATE clansocket_accounts SET last_login_at = ? WHERE id = ?`)
        .run(Date.now(), passkey.site_account_id);
    return { siteAccountId: passkey.site_account_id };
}

router.post("/authenticate/verify", async (req: Request, res: Response) => {
    const body = req.body as { response?: AuthenticationResponseJSON };
    if (!body.response) {
        res.status(HTTP_BAD_REQUEST).json({ error: "response_required" });
        return;
    }
    const out = await runAuthVerify(req, body.response);
    if ("error" in out) {
        res.status(out.status).json({ error: out.error });
        return;
    }
    const sessionId = issueSession(res, req, out.siteAccountId);
    markFreshAuth(sessionId);
    res.json({ ok: true, siteAccountId: out.siteAccountId });
});

export default router;

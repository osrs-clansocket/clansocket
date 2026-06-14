import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN } from "../../../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import type { SiteAccountRow } from "../../../../database/site/site-account-helpers/index.js";
import { requireSiteAccount } from "../../../site-middleware.js";
import { consumeChallenge, startChallenge } from "../../challenge-helpers.js";
import { countPasskeysForAccount, insertPasskey, listPasskeysForAccount } from "../../passkey-helpers.js";
import { expectedOrigin, rpId, rpName } from "../config.js";
import { requireRecentAuth } from "../step-up.js";
import { MAX_PASSKEYS, OK_FLAG, audit, challengeOf, loadAccountOr404 } from "./helpers.js";

const router: Router = Router();

async function buildAttachOptions(
    req: Request,
    siteAccountId: string,
    account: SiteAccountRow,
): Promise<{ challenge: string; payload: unknown }> {
    const userName = `${account.display_name ?? "ClanSocket user"} - ${rpName()}`;
    const options = await generateRegistrationOptions({
        rpName: rpName(),
        rpID: rpId(req),
        userID: Buffer.from(siteAccountId, "utf8"),
        userName,
        userDisplayName: userName,
        attestationType: "none",
        authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
        excludeCredentials: listPasskeysForAccount(siteAccountId).map((p) => ({ id: p.credential_id })),
    });
    return { challenge: options.challenge, payload: options };
}

router.post("/attach/options", requireSiteAccount, requireRecentAuth, async (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    if (countPasskeysForAccount(siteAccountId) >= MAX_PASSKEYS) {
        res.status(HTTP_FORBIDDEN).json({
            error: "passkey_cap_reached",
            message: `Maximum ${MAX_PASSKEYS} passkeys per account.`,
        });
        return;
    }
    const account = loadAccountOr404(siteAccountId, res);
    if (account === null) return;
    const { challenge, payload } = await buildAttachOptions(req, siteAccountId, account);
    startChallenge(challenge, "register", siteAccountId);
    res.json(payload);
});

async function attachVerify(req: Request, res: Response): Promise<void> {
    const siteAccountId = req.siteAccountId!;
    const body = req.body as { response?: RegistrationResponseJSON; deviceName?: string };
    if (!body.response) {
        res.status(HTTP_BAD_REQUEST).json({ error: "response_required" });
        return;
    }
    const ctx = consumeChallenge(challengeOf(body.response), "register");
    if (!ctx || ctx.siteAccountId !== siteAccountId) {
        res.status(HTTP_FORBIDDEN).json({ error: "challenge_invalid" });
        return;
    }
    const v = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: ctx.challenge,
        expectedOrigin: expectedOrigin(req),
        expectedRPID: rpId(req),
    });
    if (!v.verified || !v.registrationInfo) {
        res.status(HTTP_FORBIDDEN).json({ error: "verification_failed" });
        return;
    }
    const cred = v.registrationInfo.credential;
    insertPasskey({
        siteAccountId,
        credentialId: cred.id,
        publicKey: Buffer.from(cred.publicKey),
        deviceName: (body.deviceName ?? "").trim() || null,
    });
    audit(siteAccountId, "New passkey added", "A passkey for this account was registered on a device.");
    res.json({ ok: OK_FLAG });
}

router.post("/attach/verify", requireSiteAccount, requireRecentAuth, attachVerify);

export default router;

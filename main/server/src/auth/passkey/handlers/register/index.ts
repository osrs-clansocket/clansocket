import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN } from "../../../../shared/http/http-status.js";
import { sendError } from "../../../../shared/http/send-error.js";
import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import rateLimit from "express-rate-limit";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { MS_PER_MINUTE } from "../../../../shared/time.js";
import { consumeChallenge, storeChallenge } from "../../challenge-helpers.js";
import { issueSession, rpId, rpName } from "../config.js";
import { markFreshAuth } from "../step-up.js";
import { challengeOf, resolveContext, resolveTarget, type RegisterBody } from "./context.js";
import { buildBackupBundle, verifyAndInsert } from "./verify-and-insert.js";

const router: Router = Router();

const registerRateLimit = rateLimit({
    windowMs: MS_PER_MINUTE,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "rate_limit", message: "Rate limit hit — wait before retrying." },
});

router.post("/register/options", registerRateLimit, async (req: Request, res: Response) => {
    const resolved = resolveContext(req.body as RegisterBody);
    if ("error" in resolved) {
        sendError(res, HTTP_BAD_REQUEST, resolved.error);
        return;
    }
    const userId = resolved.siteAccountId ?? randomUUID();
    const baseName = resolved.displayName ?? "ClanSocket user";
    const userName = `${baseName} - ${rpName()}`;
    const options = await generateRegistrationOptions({
        rpName: rpName(),
        rpID: rpId(req),
        userID: Buffer.from(userId, "utf8"),
        userName,
        userDisplayName: userName,
        attestationType: "none",
        authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    });
    storeChallenge({ ...resolved, challenge: options.challenge });
    res.json(options);
});

router.post("/register/verify", async (req: Request, res: Response) => {
    const body = req.body as { response?: RegistrationResponseJSON; deviceName?: string };
    if (!body.response) {
        sendError(res, HTTP_BAD_REQUEST, "response_required");
        return;
    }
    const ctx = consumeChallenge(challengeOf(body.response), "register");
    if (!ctx) {
        sendError(res, HTTP_FORBIDDEN, "challenge_invalid");
        return;
    }
    const target = resolveTarget(ctx);
    if ("error" in target) {
        sendError(res, HTTP_BAD_REQUEST, target.error);
        return;
    }
    const ok = await verifyAndInsert(
        req,
        body as { response: RegistrationResponseJSON; deviceName?: string },
        ctx,
        target.siteAccountId,
    );
    if (!ok) {
        sendError(res, HTTP_FORBIDDEN, "verification_failed");
        return;
    }
    const isNew = ctx.siteAccountId !== null && ctx.linkCode === null && ctx.backupCode === null;
    const bundle = isNew ? buildBackupBundle(target.siteAccountId, target.displayName) : null;
    const sessionId = issueSession(res, req, target.siteAccountId);
    markFreshAuth(sessionId);
    res.json({
        ok: true,
        siteAccountId: target.siteAccountId,
        backupCodes: bundle?.codes ?? null,
        backupCodesFile: bundle?.file ?? null,
    });
});

export default router;

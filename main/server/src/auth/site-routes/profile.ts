import { ERROR_ACCOUNT_NOT_FOUND } from "../../shared/error-reasons.js";
import { HTTP_BAD_REQUEST, HTTP_CONFLICT, HTTP_UNAUTHORIZED } from "../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import {
    getSiteAccountById,
    listAccountHashesForSiteAccount,
    listProvidersForAccount,
    unlinkProvider,
    updateDisplayName,
} from "../../database/site/site-account-helpers/index.js";
import { revokeSiteSession } from "../site-session.js";
import { OAUTH_PROVIDER_DISCORD, OAUTH_PROVIDER_GITHUB } from "../oauth-providers.js";
import { SESSION_COOKIE, readCookie, requireSiteAccountId } from "./oauth-helpers.js";

const DISPLAY_NAME_MAX_LEN = 64;

const router = Router();

router.get("/me", (req: Request, res: Response) => {
    const siteAccountId = requireSiteAccountId(req, res);
    if (!siteAccountId) return;
    const account = getSiteAccountById(siteAccountId);
    if (!account) {
        res.status(HTTP_UNAUTHORIZED).json({ error: ERROR_ACCOUNT_NOT_FOUND });
        return;
    }
    res.json({
        id: account.id,
        provider: account.provider,
        displayName: account.display_name,
        avatarUrl: account.avatar_url,
        boundAccountHashes: listAccountHashesForSiteAccount(account.id),
    });
});

router.get("/providers", (req: Request, res: Response) => {
    const siteAccountId = requireSiteAccountId(req, res);
    if (!siteAccountId) return;
    const rows = listProvidersForAccount(siteAccountId);
    res.json({
        providers: rows.map((p) => ({
            provider: p.provider,
            displayName: p.display_name,
            avatarUrl: p.avatar_url,
            linkedAt: p.linked_at,
        })),
    });
});

router.delete("/providers/:provider", async (req: Request, res: Response) => {
    const siteAccountId = requireSiteAccountId(req, res);
    if (!siteAccountId) return;
    const provider = String(req.params.provider ?? "");
    if (provider !== OAUTH_PROVIDER_GITHUB && provider !== OAUTH_PROVIDER_DISCORD) {
        res.status(HTTP_BAD_REQUEST).json({ error: "unknown_provider" });
        return;
    }
    const providers = listProvidersForAccount(siteAccountId);
    const passkeyCount = (await import("../passkey/passkey-helpers.js")).countPasskeysForAccount(siteAccountId);
    const totalAuth = providers.length + passkeyCount;
    if (totalAuth <= 1) {
        res.status(HTTP_CONFLICT).json({
            error: "would_lock_out",
            message: "This is ur last login method. Add another before unlinking.",
        });
        return;
    }
    unlinkProvider(siteAccountId, provider);
    res.json({ ok: true });
});

router.patch("/account/display-name", (req: Request, res: Response) => {
    const siteAccountId = requireSiteAccountId(req, res);
    if (!siteAccountId) return;
    const raw = (req.body as { displayName?: unknown }).displayName;
    const displayName = typeof raw === "string" ? raw.trim() : "";
    if (displayName.length === 0 || displayName.length > DISPLAY_NAME_MAX_LEN) {
        res.status(HTTP_BAD_REQUEST).json({
            error: "bad_display_name",
            message: `Display name must be 1-${DISPLAY_NAME_MAX_LEN} chars.`,
        });
        return;
    }
    updateDisplayName(siteAccountId, displayName);
    res.json({ ok: true, displayName });
});

router.post("/logout", (req: Request, res: Response) => {
    const sessionId = readCookie(req, SESSION_COOKIE);
    if (sessionId) revokeSiteSession(sessionId);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
});

export default router;

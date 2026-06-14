import { HTTP_BAD_REQUEST, HTTP_CONFLICT, HTTP_FORBIDDEN, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import {
    cancelConsentRequest,
    findAllConsentsForSiteAccount,
    findConsentRequestById,
} from "../../../database/index.js";
import { broadcastIdentityUpdate } from "../../../data-rights/streams/identity-stream.js";
import { pushClaimConsentCancelledLive } from "../../../plugin-api/consent/claim-push.js";
import { requireSiteAccountId } from "../oauth-helpers.js";

const router = Router();

router.get("/consents", (req: Request, res: Response) => {
    const siteAccountId = requireSiteAccountId(req, res);
    if (!siteAccountId) return;
    const rows = findAllConsentsForSiteAccount(siteAccountId);
    res.json({
        consents: rows.map((r) => ({
            id: r.id,
            kind: r.kind,
            targetRsn: r.target_rsn,
            declaredClanName: r.declared_clan_name,
            declaredClanSlug: r.declared_clan_slug,
            status: r.status,
            createdAt: r.created_at,
            expiresAt: r.expires_at,
            resolvedAt: r.resolved_at,
        })),
    });
});

router.delete("/consents/:id", (req: Request, res: Response) => {
    const siteAccountId = requireSiteAccountId(req, res);
    if (!siteAccountId) return;
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isFinite(id) || id <= 0) {
        res.status(HTTP_BAD_REQUEST).json({ ok: false, error: "bad_id" });
        return;
    }
    const consent = findConsentRequestById(id);
    if (!consent || consent.requesting_site_account_id !== siteAccountId) {
        res.status(HTTP_NOT_FOUND).json({ ok: false, error: "not_found" });
        return;
    }
    if (consent.kind === "rsn") {
        res.status(HTTP_FORBIDDEN).json({
            ok: false,
            error: "wrong_kind",
            message: "Cancel RSN-verify requests from the data-rights section in your profile.",
        });
        return;
    }
    const cancelled = cancelConsentRequest(id, siteAccountId);
    if (!cancelled) {
        res.status(HTTP_CONFLICT).json({ ok: false, error: "not_pending" });
        return;
    }
    if (consent.kind === "claim") {
        pushClaimConsentCancelledLive(consent.target_rsn, id);
        broadcastIdentityUpdate(siteAccountId, "claim_consent_resolved");
    }
    res.json({ ok: true });
});

export default router;

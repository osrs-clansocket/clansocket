import { HTTP_BAD_REQUEST, HTTP_CONFLICT, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import { requireSiteAccount } from "../../../auth/site-middleware.js";
import {
    cancelConsentRequest,
    createConsentRequest,
    expirePendingConsents,
    findConsentRequestById,
    findPendingConsentsForSiteAccount,
    getSiteAccountById,
    listRsnsForSiteAccount,
    placeholderFromHash,
    revokeAccountHashBinding,
    rsnSeenInPluginHistory,
    RSN_DISPLACED_CLEANUP_MS,
    RSN_MAX_LEN,
} from "../../../database/index.js";
import { pushRsnVerifyCancelledLive, pushRsnVerifyRequestLive } from "../../../plugin-api/consent/rsn-verify.js";
import { broadcastIdentityUpdate } from "../../streams/identity-stream.js";
import { validRsn } from "./rsn-validate.js";

const router = Router();

router.get("/me/identification", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    expirePendingConsents();
    const account = getSiteAccountById(siteAccountId);
    const verifiedRsns = listRsnsForSiteAccount(siteAccountId).map((r) => {
        const displaced = r.rsn === placeholderFromHash(r.account_hash);
        return {
            accountHash: r.account_hash,
            rsn: r.rsn,
            source: r.source,
            verifiedAt: r.verified_at,
            displaced,
            displacementDeadlineAt: displaced ? r.account_last_active + RSN_DISPLACED_CLEANUP_MS : null,
            rank: r.current_rank,
        };
    });
    const pendingRequests = findPendingConsentsForSiteAccount(siteAccountId, "rsn").map((r) => ({
        id: r.id,
        targetRsn: r.target_rsn,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
    }));
    const pendingClaimConsents = findPendingConsentsForSiteAccount(siteAccountId, "claim").map((r) => ({
        id: r.id,
        targetRsn: r.target_rsn,
        declaredClanName: r.declared_clan_name ?? "",
        createdAt: r.created_at,
        expiresAt: r.expires_at,
    }));
    res.json({
        displayName: account?.display_name ?? null,
        verifiedRsns,
        pendingRequests,
        pendingClaimConsents,
    });
});

router.post("/me/rsn/request", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const rsnRaw = (req.body ?? {}).rsn;
    if (!validRsn(rsnRaw)) {
        res.status(HTTP_BAD_REQUEST).json({
            error: "bad_rsn",
            message: `RSN must be 1-${RSN_MAX_LEN} chars, alphanumeric + space/underscore/dash.`,
        });
        return;
    }
    const rsn = (rsnRaw as string).trim();
    const targetAccountHash = rsnSeenInPluginHistory(rsn);
    if (!targetAccountHash) {
        res.status(HTTP_NOT_FOUND).json({
            error: "rsn_unknown",
            message: "No plugin session has reported this name — connect via plugin first.",
        });
        return;
    }
    const existing = findPendingConsentsForSiteAccount(siteAccountId, "rsn").find((r) => r.target_rsn === rsn);
    if (existing) {
        res.status(HTTP_CONFLICT).json({ error: "already_pending", requestId: existing.id });
        return;
    }
    const created = createConsentRequest({
        kind: "rsn",
        requestingSiteAccountId: siteAccountId,
        targetAccountHash,
        targetRsn: rsn,
    });
    const requester = getSiteAccountById(siteAccountId);
    const requesterName = requester?.display_name ?? "someone";
    pushRsnVerifyRequestLive(targetAccountHash, created.id, requesterName, rsn, created.expires_at);
    broadcastIdentityUpdate(siteAccountId, "created");
    res.json({
        id: created.id,
        targetRsn: created.target_rsn,
        createdAt: created.created_at,
        expiresAt: created.expires_at,
    });
});

router.delete("/me/rsn/:accountHash", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const accountHash = String(req.params.accountHash ?? "").trim();
    if (accountHash.length === 0) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_hash" });
        return;
    }
    const removed = revokeAccountHashBinding(siteAccountId, accountHash);
    if (!removed) {
        res.status(HTTP_NOT_FOUND).json({ error: "not_found" });
        return;
    }
    broadcastIdentityUpdate(siteAccountId, "removed");
    res.json({ ok: true });
});

router.delete("/me/rsn/request/:id", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isFinite(id) || id <= 0) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_id" });
        return;
    }
    const req0 = findConsentRequestById(id);
    if (!req0 || req0.requesting_site_account_id !== siteAccountId) {
        res.status(HTTP_NOT_FOUND).json({ error: "not_found" });
        return;
    }
    const cancelled = cancelConsentRequest(id, siteAccountId);
    if (!cancelled) {
        res.status(HTTP_CONFLICT).json({ error: "not_pending" });
        return;
    }
    if (req0.target_account_hash) {
        pushRsnVerifyCancelledLive(req0.target_account_hash, id);
    }
    broadcastIdentityUpdate(siteAccountId, "cancelled");
    res.json({ ok: true });
});

export default router;

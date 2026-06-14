import {
    ERROR_CLAN_NOT_FOUND,
    ERROR_REQUEST_ALREADY_RESOLVED,
    ERROR_REQUEST_NOT_FOUND,
} from "../../shared/error-reasons.js";
import { HTTP_CONFLICT, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../shared/http/http-status.js";
import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { ClanAuditActions, recordClanAudit } from "../../database/index.js";
import { insertClanManager, listManagersForClan } from "../../database/clans/access/clan-manager-helpers.js";
import {
    getManagerRequestById,
    listPendingRequestsForClan,
    resolveManagerRequest,
} from "../../database/clans/access/clan-manager-request-helpers.js";
import {
    getSiteAccountById,
    bindSiteAccountAccountHash,
    listAccountHashesForSiteAccount,
} from "../../database/site/site-account-helpers/index.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import {
    REQUEST_STATUS_APPROVED,
    REQUEST_STATUS_DENIED,
    REQUEST_STATUS_PENDING,
} from "../../database/site/manager-request-status.js";
import { loadOwnedClan } from "../load-owned-clan.js";

const router = Router();

router.get("/:slug/manager-requests", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
    if (!owned) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    const requests = listPendingRequestsForClan(owned.id).map((r) => {
        const account = getSiteAccountById(r.site_account_id);
        return {
            id: r.id,
            siteAccountId: r.site_account_id,
            siteAccountDisplay: account?.display_name ?? r.site_account_id,
            siteAccountProvider: account?.provider ?? null,
            declaredRsn: r.declared_rsn,
            declaredAccountHash: r.declared_account_hash,
            pluginVerified: r.plugin_verified === 1,
            source: r.source,
            requestedAt: r.requested_at,
        };
    });
    recordClanAudit(owned.id, {
        actor: siteAccountId,
        action: "server:read.manager_requests",
        targetId: owned.id,
        payload: { count: requests.length },
    });
    res.json({ requests });
});

router.post("/:slug/manager-requests/:id/approve", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
    if (!owned) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    const request = getManagerRequestById(String(req.params.id ?? ""));
    if (!request || request.clan_id !== owned.id || request.status !== REQUEST_STATUS_PENDING) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_REQUEST_NOT_FOUND });
        return;
    }
    const resolved = resolveManagerRequest(request.id, REQUEST_STATUS_APPROVED, siteAccountId);
    if (!resolved) {
        res.status(HTTP_CONFLICT).json({ error: ERROR_REQUEST_ALREADY_RESOLVED });
        return;
    }
    try {
        insertClanManager(resolved.site_account_id, resolved.clan_id, "manager", "approval_2fa", siteAccountId);
        if (resolved.declared_account_hash) {
            bindSiteAccountAccountHash(resolved.site_account_id, resolved.declared_account_hash);
        }
        recordClanAudit(owned.id, {
            actor: siteAccountId,
            action: ClanAuditActions.ManagerRequestApproved,
            targetId: resolved.id,
            payload: { targetSiteAccountId: resolved.site_account_id, declaredRsn: resolved.declared_rsn },
        });
        res.json({ ok: true, siteAccountId: resolved.site_account_id });
    } catch (err) {
        logger.error(`[clansocket_clans] approve failed: ${(err as Error).message}`);
        res.status(HTTP_INTERNAL_ERROR).json({ error: "internal" });
    }
});

router.post("/:slug/manager-requests/:id/deny", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
    if (!owned) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    const request = getManagerRequestById(String(req.params.id ?? ""));
    if (!request || request.clan_id !== owned.id || request.status !== REQUEST_STATUS_PENDING) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_REQUEST_NOT_FOUND });
        return;
    }
    const resolved = resolveManagerRequest(request.id, REQUEST_STATUS_DENIED, siteAccountId);
    if (!resolved) {
        res.status(HTTP_CONFLICT).json({ error: ERROR_REQUEST_ALREADY_RESOLVED });
        return;
    }
    recordClanAudit(owned.id, {
        actor: siteAccountId,
        action: ClanAuditActions.ManagerRequestDenied,
        targetId: resolved.id,
        payload: { targetSiteAccountId: resolved.site_account_id, declaredRsn: resolved.declared_rsn },
    });
    res.json({ ok: true });
});

router.get("/:slug/managers", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
    if (!owned) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    const managers = listManagersForClan(owned.id).map((m) => {
        const account = getSiteAccountById(m.site_account_id);
        return {
            siteAccountId: m.site_account_id,
            siteAccountDisplay: account?.display_name ?? m.site_account_id,
            siteAccountProvider: account?.provider ?? null,
            boundAccountHashes: listAccountHashesForSiteAccount(m.site_account_id),
            role: m.role,
            grantedVia: m.granted_via,
            grantedAt: m.granted_at,
        };
    });
    recordClanAudit(owned.id, {
        actor: siteAccountId,
        action: "server:read.managers",
        targetId: owned.id,
        payload: { count: managers.length },
    });
    res.json({ managers });
});

export default router;

import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { HTTP_BAD_REQUEST, HTTP_NOT_FOUND } from "../../shared/http/http-status.js";
import { getClanBySlug, listRosterDiffsForFingerprint, recordClanAudit } from "../../database/index.js";
import { isClanManager } from "../../database/clans/access/clan-manager-helpers.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { resolveManager } from "./manager-context.js";

const router: Router = Router();

router.get("/:slug/manage/me", requireSiteAccount, (req: Request, res: Response) => {
    const slug = String(req.params.slug ?? "").toLowerCase();
    const siteAccountId = req.siteAccountId;
    if (slug.length === 0 || siteAccountId === undefined) {
        res.status(HTTP_BAD_REQUEST).json({ isManager: false });
        return;
    }
    const clan = getClanBySlug(slug);
    if (!clan || clan.archived_at !== null) {
        res.status(HTTP_NOT_FOUND).json({ isManager: false });
        return;
    }
    const isManager = isClanManager(siteAccountId, clan.id);
    res.json({ isManager, clanId: isManager ? clan.id : null, slug: clan.slug });
});

router.get("/:slug/manage/roster-diffs", requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    const toFingerprint = typeof req.query.to === "string" ? req.query.to : "";
    if (toFingerprint.length === 0) {
        res.status(HTTP_BAD_REQUEST).json({ error: "missing_fingerprint" });
        return;
    }
    try {
        const diffs = listRosterDiffsForFingerprint(ctx.clanId, toFingerprint);
        recordClanAudit(ctx.clanId, {
            actor: ctx.siteAccountId,
            action: "server:read.roster_diffs",
            targetId: toFingerprint,
            payload: { count: diffs.length },
        });
        res.json({ diffs });
    } catch (err) {
        logger.error(`[clansocket_manage] roster-diffs failed for ${ctx.clanId}: ${(err as Error).message}`);
        res.status(500).json({ error: "diffs_lookup_failed" });
    }
});

export default router;

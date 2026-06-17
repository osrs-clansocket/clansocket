import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../api/middleware.js";
import { requireSiteAccountId } from "../../auth/site-routes/oauth-helpers.js";
import { isClanManager } from "../../database/clans/access/clan-manager-helpers.js";
import { getClanBySlug } from "../../database/index.js";
import {
    HTTP_ACCEPTED,
    HTTP_CONFLICT,
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_NOT_FOUND,
} from "../../shared/http/http-status.js";
import { triggerBackfillForClan } from "../ingestor/wom-backfill-orchestrator.js";

const router: Router = Router();

router.post(
    "/:slug/sync-now",
    handleAsync(async (req: Request, res: Response) => {
        const sid = requireSiteAccountId(req, res);
        if (!sid) return;
        const slug = (req.params.slug as string).toLowerCase();
        try {
            const clan = getClanBySlug(slug);
            if (!clan) {
                res.status(HTTP_NOT_FOUND).json({ error: "clan_not_found" });
                return;
            }
            if (!isClanManager(sid, clan.id)) {
                res.status(HTTP_FORBIDDEN).json({ error: "not_clan_manager" });
                return;
            }
            const result = triggerBackfillForClan(clan.id);
            if (result.status === "skipped-no-identity") {
                res.status(HTTP_NOT_FOUND).json({ error: "no_wom_linked" });
                return;
            }
            if (result.status === "skipped-gate") {
                res.status(HTTP_CONFLICT).json({
                    ok: false,
                    reason: "gated",
                    next_eligible_at: result.nextEligibleAt,
                });
                return;
            }
            res.status(HTTP_ACCEPTED).json({ ok: true, enqueued: result.enqueued });
        } catch (err) {
            logger.error(`[wom] sync-now failed slug=${slug}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "sync_now_failed" });
        }
    }),
);

export default router;

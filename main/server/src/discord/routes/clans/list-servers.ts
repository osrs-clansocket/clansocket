import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../../api/middleware.js";
import { requireSiteAccountId } from "../../../auth/site-routes/oauth-helpers.js";
import { isClanManager } from "../../../database/clans/access/clan-manager-helpers.js";
import { getClanBySlug } from "../../../database/index.js";
import { listByClan } from "../../../database/discord/servers/list-by-clan.js";
import { HTTP_FORBIDDEN, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.get(
    "/:slug/servers",
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
            const servers = listByClan(clan.id);
            res.json({ servers });
        } catch (err) {
            logger.error(`[discord] list-servers failed for slug=${slug}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "list_servers_failed" });
        }
    }),
);

export default router;

import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../../api/middleware.js";
import { requireSiteAccountId } from "../../../auth/site-routes/oauth-helpers.js";
import type { Actor } from "../../../clan-vault/shared/vault-types.js";
import { buildByoBotStatusRow } from "../../../data-rights/streams/topics/discord-byo-bot-topic.js";
import { isClanManager } from "../../../database/clans/access/clan-manager-helpers.js";
import { getClanBySlug } from "../../../database/index.js";
import { HTTP_FORBIDDEN, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.get(
    "/:slug",
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
            const actor: Actor = { kind: "user", user_id: sid };
            const row = await buildByoBotStatusRow(clan.id, actor);
            res.json(row);
        } catch (err) {
            logger.error(`[discord-byo] status failed slug=${slug}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "status_failed" });
        }
    }),
);

export default router;

import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../../api/middleware.js";
import { requireSiteAccountId } from "../../../auth/site-routes/oauth-helpers.js";
import { isClanManager } from "../../../database/clans/access/clan-manager-helpers.js";
import { updateServerBot } from "../../../database/discord/servers/update-server-bot.js";
import { getClanBySlug } from "../../../database/index.js";
import {
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_NOT_FOUND,
} from "../../../shared/http/http-status.js";

const DEFAULT_BOT_ID = "clansocket-default";

const router: Router = Router();

router.post(
    "/:slug/unbind/:guildId",
    handleAsync(async (req: Request, res: Response) => {
        const sid = requireSiteAccountId(req, res);
        if (!sid) return;
        const slug = (req.params.slug as string).toLowerCase();
        const guildId = req.params.guildId as string;
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
            const unbound = updateServerBot(clan.id, guildId, DEFAULT_BOT_ID, null);
            if (!unbound) {
                res.status(HTTP_BAD_REQUEST).json({ error: "guild_not_in_clan" });
                return;
            }
            res.json({ ok: true, unbound_guild_id: guildId });
        } catch (err) {
            logger.error(`[discord-byo] unbind failed slug=${slug} guildId=${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "unbind_failed" });
        }
    }),
);

export default router;

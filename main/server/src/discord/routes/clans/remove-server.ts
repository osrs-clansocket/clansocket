import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../../api/middleware.js";
import { requireSiteAccountId } from "../../../auth/site-routes/oauth-helpers.js";
import { isClanManager } from "../../../database/clans/access/clan-manager-helpers.js";
import { enqueueOutboundEvent } from "../../../database/discord/outbound/enqueue.js";
import { removeServer } from "../../../database/discord/servers/remove.js";
import { getClanBySlug, getSiteAccountById } from "../../../database/index.js";
import { HTTP_FORBIDDEN, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";

const TARGET_KIND_LEAVE_GUILD = "leave_guild";
const DEFAULT_BOT_ID = "clansocket-default";

const router: Router = Router();

router.delete(
    "/:slug/servers/:guildId",
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
            const account = getSiteAccountById(sid);
            const changed = removeServer({
                guildId,
                clanId: clan.id,
                removerSiteAccountId: sid,
                removerSiteAccountName: account?.display_name ?? null,
            });
            if (!changed) {
                res.status(HTTP_NOT_FOUND).json({ error: "server_not_found" });
                return;
            }
            enqueueOutboundEvent({
                botId: DEFAULT_BOT_ID,
                guildId,
                clanId: clan.id,
                clanName: clan.display_name,
                targetKind: TARGET_KIND_LEAVE_GUILD,
                payload: { guildId },
            });
            res.json({ ok: true });
        } catch (err) {
            logger.error(`[discord] remove-server failed slug=${slug} guild=${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "remove_server_failed" });
        }
    }),
);

export default router;

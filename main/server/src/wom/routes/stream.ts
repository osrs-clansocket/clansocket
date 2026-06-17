import { Router, type Request, type Response } from "express";
import { requireSiteAccountId } from "../../auth/site-routes/oauth-helpers.js";
import { scopeKeyForClan, subscribeDbWrites } from "../../data-rights/streams/writes-stream.js";
import { isClanManager } from "../../database/clans/access/clan-manager-helpers.js";
import { getClanBySlug } from "../../database/index.js";
import { HTTP_FORBIDDEN, HTTP_NOT_FOUND, HTTP_OK } from "../../shared/http/http-status.js";

const IDENTITY_TABLE = "clan_wom_identity";
const OUTBOUND_TABLE = "clan_wom_outbound_events";

const router: Router = Router();

router.get("/:slug/stream", (req: Request, res: Response) => {
    const sid = requireSiteAccountId(req, res);
    if (!sid) return;
    const slug = (req.params.slug as string).toLowerCase();
    const clan = getClanBySlug(slug);
    if (!clan) {
        res.status(HTTP_NOT_FOUND).json({ error: "clan_not_found" });
        return;
    }
    if (!isClanManager(sid, clan.id)) {
        res.status(HTTP_FORBIDDEN).json({ error: "not_clan_manager" });
        return;
    }
    res.writeHead(HTTP_OK, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.write(`event: ready\ndata: ${JSON.stringify({ slug })}\n\n`);
    const clanScope = scopeKeyForClan(clan.id);
    const unsubscribe = subscribeDbWrites((event) => {
        if (event.scopeKey !== clanScope) return;
        if (event.table !== IDENTITY_TABLE && event.table !== OUTBOUND_TABLE) return;
        res.write(`event: wom\ndata: ${JSON.stringify({ slug, table: event.table })}\n\n`);
    });
    req.on("close", () => unsubscribe());
});

export default router;

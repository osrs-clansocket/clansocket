import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../../api/middleware.js";
import { requireSiteAccountId } from "../../../auth/site-routes/oauth-helpers.js";
import { listAllEmojis, listEmojisForBot } from "../../../database/discord/emojis/list.js";
import { HTTP_INTERNAL_ERROR } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.get(
    "/",
    handleAsync(async (req: Request, res: Response) => {
        const sid = requireSiteAccountId(req, res);
        if (!sid) return;
        try {
            res.json({ emojis: listAllEmojis() });
        } catch (err) {
            logger.error(`[discord] emoji list failed: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "emoji_list_failed" });
        }
    }),
);

router.get(
    "/:botId",
    handleAsync(async (req: Request, res: Response) => {
        const sid = requireSiteAccountId(req, res);
        if (!sid) return;
        const botId = req.params.botId as string;
        try {
            res.json({ emojis: listEmojisForBot(botId) });
        } catch (err) {
            logger.error(`[discord] emoji list failed for bot ${botId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "emoji_list_failed" });
        }
    }),
);

export default router;

import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync } from "../../../api/middleware.js";
import { listByBot } from "../../../database/discord/servers/list-by-bot.js";
import { HTTP_INTERNAL_ERROR } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.get(
    "/:botId/servers",
    authenticate,
    handleAsync(async (req: Request, res: Response) => {
        const botId = req.params.botId as string;
        try {
            const servers = listByBot(botId);
            res.json({ servers });
        } catch (err) {
            logger.error(`[discord] list bot servers failed for ${botId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "list_bot_servers_failed" });
        }
    }),
);

export default router;

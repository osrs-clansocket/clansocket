import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync } from "../../../api/middleware.js";
import { listBotIdentitiesWithDecryptedTokens } from "../../../database/discord/list-bots.js";
import { HTTP_INTERNAL_ERROR } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.get(
    "/",
    authenticate,
    handleAsync(async (_req: Request, res: Response) => {
        try {
            const bots = await listBotIdentitiesWithDecryptedTokens();
            res.json({ bots });
        } catch (err) {
            logger.error(`[discord] list bots failed: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "list_bots_failed" });
        }
    }),
);

export default router;

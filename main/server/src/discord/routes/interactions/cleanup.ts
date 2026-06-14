import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync } from "../../../api/middleware.js";
import { cleanupExpiredInteractions } from "../../../database/discord/interactions/cleanup-expired.js";
import { HTTP_INTERNAL_ERROR } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.post(
    "/cleanup",
    authenticate,
    handleAsync(async (_req: Request, res: Response) => {
        try {
            const deleted = cleanupExpiredInteractions();
            res.json({ deleted });
        } catch (err) {
            logger.error(`[discord] interactions cleanup failed: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "interactions_cleanup_failed" });
        }
    }),
);

export default router;

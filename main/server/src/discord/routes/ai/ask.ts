import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync } from "../../../api/middleware.js";
import { HTTP_BAD_REQUEST } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.post(
    "/ask",
    authenticate,
    handleAsync(async (req: Request, res: Response) => {
        const text = typeof req.body?.text === "string" ? req.body.text : null;
        if (!text) {
            res.status(HTTP_BAD_REQUEST).json({ error: "text_required" });
            return;
        }
        logger.info(`[discord] ai-ask received text length=${text.length}; pending Varez wiring`);
        res.json({ message: "", mentions: [] });
    }),
);

export default router;

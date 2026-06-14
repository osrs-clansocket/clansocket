import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync } from "../../../api/middleware.js";
import { recordFromDiscord } from "../../../database/discord/audit/record.js";
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.post(
    "/",
    authenticate,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = typeof req.body?.guildId === "string" ? req.body.guildId : null;
        const userId = typeof req.body?.userId === "string" ? req.body.userId : null;
        const action = typeof req.body?.action === "string" ? req.body.action : null;
        const data = req.body?.data && typeof req.body.data === "object" ? req.body.data : {};
        if (!guildId || !userId || !action) {
            res.status(HTTP_BAD_REQUEST).json({ error: "guildId_userId_action_required" });
            return;
        }
        try {
            const recorded = recordFromDiscord({ guildId, discordUserId: userId, action, data });
            if (!recorded) {
                res.status(HTTP_NOT_FOUND).json({ error: "guild_not_registered" });
                return;
            }
            res.json({ ok: true });
        } catch (err) {
            logger.error(`[discord] audit record failed for ${guildId}/${userId}/${action}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "audit_record_failed" });
        }
    }),
);

export default router;

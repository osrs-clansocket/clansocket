import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveServerByGuildId } from "../../../database/discord/resolve-server.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.get(
    "/:guildId",
    authenticate,
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        try {
            const server = resolveServerByGuildId(guildId);
            if (!server) {
                res.status(HTTP_NOT_FOUND).json({ error: "guild_not_registered" });
                return;
            }
            res.json({ server });
        } catch (err) {
            logger.error(`[discord] resolve server failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "resolve_server_failed" });
        }
    }),
);

export default router;

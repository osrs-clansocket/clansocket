import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync, validateGuildId } from "../../../api/middleware.js";
import { listWebhookTokens } from "../../../database/discord/webhook-tokens/list.js";
import { resolveServerByGuildId } from "../../../database/discord/resolve-server.js";
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR, HTTP_OK } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.get(
    "/:guildId",
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const server = resolveServerByGuildId(guildId);
        if (!server) {
            res.status(HTTP_BAD_REQUEST).json({ error: "guild_not_bound" });
            return;
        }
        try {
            const tokens = listWebhookTokens(server.clan_id, guildId);
            res.status(HTTP_OK).json({ tokens });
        } catch (err) {
            logger.error(`[discord] webhook-tokens list failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "webhook_tokens_list_failed" });
        }
    }),
);

export default router;

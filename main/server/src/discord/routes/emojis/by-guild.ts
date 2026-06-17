import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync, validateGuildId } from "../../../api/middleware.js";
import { listEmojisForBot } from "../../../database/discord/emojis/list.js";
import { resolveServerByGuildId } from "../../../database/discord/resolve-server.js";
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR, HTTP_OK } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.get(
    "/by-guild/:guildId",
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const server = resolveServerByGuildId(guildId);
        if (!server) {
            res.status(HTTP_BAD_REQUEST).json({ error: "guild_not_bound" });
            return;
        }
        try {
            const emojis = listEmojisForBot(server.bot_id);
            res.status(HTTP_OK).json({ emojis, botId: server.bot_id });
        } catch (err) {
            logger.error(`[discord] emoji list-by-guild failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "emoji_list_failed" });
        }
    }),
);

export default router;

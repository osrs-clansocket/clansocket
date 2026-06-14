import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { deleteServerEmoji } from "../../../database/discord/state/server-emojis/delete-server-emoji.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.delete(
    "/server-emojis/:guildId/:emojiId",
    authenticate,
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const emojiId = req.params.emojiId as string;
        const clanId = resolveClanIdForGuild(guildId);
        if (!clanId) {
            res.status(HTTP_NOT_FOUND).json({ error: "guild_not_bound" });
            return;
        }
        try {
            deleteServerEmoji(clanId, guildId, emojiId);
            res.status(HTTP_OK).json({ ok: true });
        } catch (err) {
            logger.error(`[discord] server emoji delete failed for ${guildId}/${emojiId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "server_emoji_delete_failed" });
        }
    }),
);

export default router;

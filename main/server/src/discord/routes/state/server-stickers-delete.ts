import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { deleteServerSticker } from "../../../database/discord/state/server-stickers/delete-server-sticker.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.delete(
    "/server-stickers/:guildId/:stickerId",
    authenticate,
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const stickerId = req.params.stickerId as string;
        const clanId = resolveClanIdForGuild(guildId);
        if (!clanId) {
            res.status(HTTP_NOT_FOUND).json({ error: "guild_not_bound" });
            return;
        }
        try {
            deleteServerSticker(clanId, guildId, stickerId);
            res.status(HTTP_OK).json({ ok: true });
        } catch (err) {
            logger.error(
                `[discord] server sticker delete failed for ${guildId}/${stickerId}: ${(err as Error).message}`,
            );
            res.status(HTTP_INTERNAL_ERROR).json({ error: "server_sticker_delete_failed" });
        }
    }),
);

export default router;

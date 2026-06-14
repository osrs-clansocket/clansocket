import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { deleteChannel } from "../../../database/discord/state/channels/delete-channel.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.delete(
    "/channels/:guildId/:channelId",
    authenticate,
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const channelId = req.params.channelId as string;
        const clanId = resolveClanIdForGuild(guildId);
        if (!clanId) {
            res.status(HTTP_NOT_FOUND).json({ error: "guild_not_bound" });
            return;
        }
        try {
            deleteChannel(clanId, guildId, channelId);
            res.status(HTTP_OK).json({ ok: true });
        } catch (err) {
            logger.error(`[discord] channel delete failed for ${guildId}/${channelId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "channel_delete_failed" });
        }
    }),
);

export default router;

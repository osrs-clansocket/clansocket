import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { replaceOverwritesForChannel } from "../../../database/discord/state/channel-overwrites/replace-overwrites-for-channel.js";
import type { ChannelOverwriteRow } from "../../../database/discord/state/types.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

interface SyncBody {
    overwrites: ChannelOverwriteRow[];
}

const router: Router = Router();

router.post(
    "/channel-overwrites/:guildId/:channelId/sync",
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
        const body = req.body as SyncBody;
        try {
            replaceOverwritesForChannel(clanId, guildId, channelId, body.overwrites);
            res.status(HTTP_OK).json({ ok: true, count: body.overwrites.length });
        } catch (err) {
            logger.error(`[discord] channel-overwrites sync failed for ${guildId}/${channelId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "channel_overwrites_sync_failed" });
        }
    }),
);

export default router;

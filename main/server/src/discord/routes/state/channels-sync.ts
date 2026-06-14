import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { replaceChannelsForGuild } from "../../../database/discord/state/channels/replace-channels-for-guild.js";
import type { ChannelRow } from "../../../database/discord/state/types.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

interface SyncBody {
    channels: ChannelRow[];
}

const router: Router = Router();

router.post(
    "/channels/:guildId/sync",
    authenticate,
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const clanId = resolveClanIdForGuild(guildId);
        if (!clanId) {
            res.status(HTTP_NOT_FOUND).json({ error: "guild_not_bound" });
            return;
        }
        const body = req.body as SyncBody;
        try {
            replaceChannelsForGuild(clanId, guildId, body.channels);
            res.status(HTTP_OK).json({ ok: true, count: body.channels.length });
        } catch (err) {
            logger.error(`[discord] channels sync failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "channels_sync_failed" });
        }
    }),
);

export default router;

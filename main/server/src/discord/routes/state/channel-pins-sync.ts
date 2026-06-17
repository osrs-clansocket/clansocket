import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { replacePinsForChannel } from "../../../database/discord/state/channel-pins/replace-pins-for-channel.js";
import type { ChannelPinRow } from "../../../database/discord/state/types.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

interface SyncBody {
    channelId: string;
    pins: ChannelPinRow[];
}

const router: Router = Router();

router.post(
    "/channel-pins/:guildId/sync",
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
            replacePinsForChannel(clanId, guildId, body.channelId, body.pins);
            res.status(HTTP_OK).json({ ok: true, count: body.pins.length });
        } catch (err) {
            logger.error(`[discord] channel-pins sync failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "channel_pins_sync_failed" });
        }
    }),
);

export default router;

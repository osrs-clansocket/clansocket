import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync, validateGuildId } from "../../../api/middleware.js";
import { listPinsForChannel } from "../../../database/discord/state/channel-pins/list-pins-for-channel.js";
import { resolveServerByGuildId } from "../../../database/discord/resolve-server.js";
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR, HTTP_OK } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.get(
    "/:guildId/:channelId/pins",
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const channelId = req.params.channelId as string;
        const server = resolveServerByGuildId(guildId);
        if (!server) {
            res.status(HTTP_BAD_REQUEST).json({ error: "guild_not_bound" });
            return;
        }
        try {
            const pins = listPinsForChannel(server.clan_id, guildId, channelId);
            res.status(HTTP_OK).json({ pins });
        } catch (err) {
            logger.error(`[discord] channel-pins list failed for ${guildId}/${channelId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "channel_pins_list_failed" });
        }
    }),
);

export default router;

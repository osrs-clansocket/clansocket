import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { replaceServerStickersForGuild } from "../../../database/discord/state/server-stickers/replace-server-stickers-for-guild.js";
import type { ServerStickerRow } from "../../../database/discord/state/types.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

interface SyncBody {
    stickers: ServerStickerRow[];
}

const router: Router = Router();

router.post(
    "/server-stickers/:guildId/sync",
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
            replaceServerStickersForGuild(clanId, guildId, body.stickers);
            res.status(HTTP_OK).json({ ok: true, count: body.stickers.length });
        } catch (err) {
            logger.error(`[discord] server stickers sync failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "server_stickers_sync_failed" });
        }
    }),
);

export default router;

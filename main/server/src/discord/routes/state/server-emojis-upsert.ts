import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { upsertServerEmoji } from "../../../database/discord/state/server-emojis/upsert-server-emoji.js";
import type { ServerEmojiRow } from "../../../database/discord/state/types.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

interface UpsertBody {
    emoji: ServerEmojiRow;
}

const router: Router = Router();

router.post(
    "/server-emojis/:guildId/:emojiId",
    authenticate,
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const clanId = resolveClanIdForGuild(guildId);
        if (!clanId) {
            res.status(HTTP_NOT_FOUND).json({ error: "guild_not_bound" });
            return;
        }
        const body = req.body as UpsertBody;
        try {
            upsertServerEmoji(clanId, guildId, body.emoji);
            res.status(HTTP_OK).json({ ok: true });
        } catch (err) {
            logger.error(`[discord] server emoji upsert failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "server_emoji_upsert_failed" });
        }
    }),
);

export default router;

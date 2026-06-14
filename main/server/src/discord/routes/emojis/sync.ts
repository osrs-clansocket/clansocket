import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync } from "../../../api/middleware.js";
import { replaceEmojisForBot, type EmojiInput } from "../../../database/discord/emojis/upsert-batch.js";
import { lookupPublicPath } from "../../emojis/scan-public-paths.js";
import { flushExpandShortcodesCache } from "../../emojis/shortcode-expander.js";
import { HTTP_INTERNAL_ERROR } from "../../../shared/http/http-status.js";

interface SyncBody {
    botId: string;
    emojis: Array<{ id: string; name: string; animated: boolean }>;
}

function buildInputs(body: SyncBody): EmojiInput[] {
    return body.emojis.map((e) => ({
        botId: body.botId,
        emojiId: e.id,
        name: e.name,
        animated: e.animated,
        publicPath: lookupPublicPath(e.name),
    }));
}

const router: Router = Router();

router.post(
    "/sync",
    authenticate,
    handleAsync(async (req: Request, res: Response) => {
        const body = req.body as SyncBody;
        try {
            const inputs = buildInputs(body);
            replaceEmojisForBot(body.botId, inputs);
            flushExpandShortcodesCache();
            const matched = inputs.filter((e) => e.publicPath !== null).length;
            res.json({ ok: true, total: inputs.length, matched });
        } catch (err) {
            logger.error(`[discord] emoji sync failed for bot ${body.botId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "emoji_sync_failed" });
        }
    }),
);

export default router;

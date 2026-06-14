import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync } from "../../../api/middleware.js";
import { encryptToken } from "../../../crypto/aes-gcm-encrypter.js";
import { loadDiscordMasterKey } from "../../../crypto/master-key-loader.js";
import { upsertInteractionPending } from "../../../database/discord/interactions/upsert-pending.js";
import { HTTP_INTERNAL_ERROR } from "../../../shared/http/http-status.js";

interface UpsertBody {
    interactionId: string;
    botId: string;
    botName?: string | null;
    guildId: string | null;
    channelId: string;
    channelName?: string | null;
    userId: string;
    kind: string;
    token: string;
    tokenKeyId?: string | null;
}

function applyUpsertBody(body: UpsertBody): void {
    const masterKey = loadDiscordMasterKey();
    const { b64, iv } = encryptToken(body.token, masterKey);
    upsertInteractionPending({
        interactionId: body.interactionId,
        botId: body.botId,
        botName: body.botName,
        guildId: body.guildId,
        channelId: body.channelId,
        channelName: body.channelName,
        userId: body.userId,
        kind: body.kind,
        encryptedTokenB64: b64,
        tokenIvB64: iv,
        tokenKeyId: body.tokenKeyId ?? null,
    });
}

const router: Router = Router();

router.post(
    "/",
    authenticate,
    handleAsync(async (req: Request, res: Response) => {
        const body = req.body as UpsertBody;
        try {
            applyUpsertBody(body);
            res.json({ ok: true });
        } catch (err) {
            logger.error(`[discord] interactions upsert failed for ${body.interactionId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "interactions_upsert_failed" });
        }
    }),
);

export default router;

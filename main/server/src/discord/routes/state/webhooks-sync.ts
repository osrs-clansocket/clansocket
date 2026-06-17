import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { remapAutoHooksWebhook } from "../../../database/discord/auto-hooks/remap-webhook.js";
import { replaceWebhooksForChannel } from "../../../database/discord/state/webhooks/replace-webhooks-for-channel.js";
import type { WebhookRow } from "../../../database/discord/state/types.js";
import { deleteWebhookToken } from "../../../database/discord/webhook-tokens/delete.js";
import { upsertWebhookToken } from "../../../database/discord/webhook-tokens/upsert.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

interface WebhookTokenSyncPayload {
    webhookId: string;
    channelId: string;
    channelName: string | null;
    plaintextToken: string;
    acquiredByBotId: string;
}

interface WebhookReplacement {
    oldWebhookId: string;
    newWebhookId: string;
}

interface SyncBody {
    channelId: string;
    webhooks: WebhookRow[];
    tokens?: WebhookTokenSyncPayload[];
    replacement?: WebhookReplacement;
}

function persistTokens(clanId: string, guildId: string, tokens: readonly WebhookTokenSyncPayload[]): void {
    for (const tok of tokens) {
        try {
            upsertWebhookToken({
                clanId,
                guildId,
                webhookId: tok.webhookId,
                channelId: tok.channelId,
                channelName: tok.channelName,
                plaintextToken: tok.plaintextToken,
                acquiredByBotId: tok.acquiredByBotId,
                boundBySiteAccountId: null,
                boundBySiteAccountName: null,
            });
        } catch (err) {
            logger.warn(`[discord] token persist failed for ${tok.webhookId}: ${(err as Error).message}`);
        }
    }
}

function applyReplacement(clanId: string, guildId: string, replacement: WebhookReplacement): void {
    try {
        const remapped = remapAutoHooksWebhook(clanId, guildId, replacement.oldWebhookId, replacement.newWebhookId);
        deleteWebhookToken(clanId, guildId, replacement.oldWebhookId);
        logger.info(
            `[discord] webhook healed: ${replacement.oldWebhookId} → ${replacement.newWebhookId} (${remapped} auto-hooks remapped)`,
        );
    } catch (err) {
        logger.warn(`[discord] webhook replacement apply failed: ${(err as Error).message}`);
    }
}

const router: Router = Router();

router.post(
    "/webhooks/:guildId/sync",
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
            replaceWebhooksForChannel(clanId, guildId, body.channelId, body.webhooks);
            persistTokens(clanId, guildId, body.tokens ?? []);
            if (body.replacement) applyReplacement(clanId, guildId, body.replacement);
            res.status(HTTP_OK).json({ ok: true, count: body.webhooks.length });
        } catch (err) {
            logger.error(`[discord] webhooks sync failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "webhooks_sync_failed" });
        }
    }),
);

export default router;

import { randomUUID } from "node:crypto";
import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync, validateGuildId } from "../../../api/middleware.js";
import { ClanAuditActions } from "../../../database/clans/audit/clan-audit-actions.js";
import { recordClanAudit } from "../../../database/clans/audit/clan-audit-helpers/record.js";
import { enqueueDraftChange } from "../../../database/discord/drafts/enqueue-change.js";
import { openDraftSession } from "../../../database/discord/drafts/open-session.js";
import { publishSingleOpDraft } from "../../../database/discord/publish-queue/publish-single.js";
import { resolveServerByGuildId } from "../../../database/discord/resolve-server.js";
import { validateOperation } from "../../../database/discord/validators/validate-operation.js";
import {
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_OK,
} from "../../../shared/http/http-status.js";

const TARGET_KIND = "discord_webhook";
const OP_KIND_CREATE = "create";
const RATE_LIMIT_ROUTE = "/channels/:id/webhooks";
const CLANSOCKET_PERMISSION = "discord:webhooks.create";
const WEBHOOK_TYPE_INCOMING = 1;

interface CreateWebhookBody {
    userId: string;
    channelId: string;
    name: string;
    avatarUrl?: string | null;
}

const router: Router = Router();

router.post(
    "/:guildId",
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const server = resolveServerByGuildId(guildId);
        if (!server) {
            res.status(HTTP_BAD_REQUEST).json({ error: "guild_not_bound" });
            return;
        }
        const body = req.body as CreateWebhookBody;
        const validation = validateOperation(
            { requiredClansocketPermission: CLANSOCKET_PERMISSION, rateLimitRoute: RATE_LIMIT_ROUTE },
            { botId: server.bot_id, clanId: server.clan_id, guildId, userId: body.userId },
        );
        if (!validation.ok) {
            res.status(HTTP_FORBIDDEN).json({ error: "validation_failed", failures: validation.failures });
            return;
        }
        try {
            const sessionId = openDraftSession({
                clanId: server.clan_id,
                guildId,
                ownerSiteAccountId: body.userId,
            });
            const tempId = `temp:${randomUUID()}`;
            const afterJson = JSON.stringify({
                channelId: body.channelId,
                name: body.name,
                avatarUrl: body.avatarUrl ?? null,
            });
            const changeId = enqueueDraftChange({
                clanId: server.clan_id,
                guildId,
                sessionId,
                opKind: OP_KIND_CREATE,
                targetKind: TARGET_KIND,
                targetIdOrTemp: tempId,
                afterJson,
            });
            const queueId = publishSingleOpDraft({ clanId: server.clan_id, guildId, sessionId });
            recordClanAudit(server.clan_id, {
                actor: body.userId,
                action: ClanAuditActions.DiscordWebhooksCreate,
                targetId: tempId,
                guildId,
                payload: {
                    guildId,
                    targetName: body.name,
                    channelId: body.channelId,
                    webhookType: WEBHOOK_TYPE_INCOMING,
                },
            });
            res.status(HTTP_OK).json({ sessionId, changeId, queueId, tempId });
        } catch (err) {
            logger.error(`[discord] webhook create failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "webhook_create_failed" });
        }
    }),
);

export default router;

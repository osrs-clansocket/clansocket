import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync, validateGuildId } from "../../../api/middleware.js";
import { getAutoHookById } from "../../../database/discord/auto-hooks/get-by-id.js";
import type { AutoHookRow } from "../../../database/discord/auto-hooks/list.js";
import { enqueueOutboundEvent } from "../../../database/discord/outbound/enqueue.js";
import { resolveServerByGuildId } from "../../../database/discord/resolve-server.js";
import { maybeHealWebhook } from "../../../database/discord/webhook-heal/check-and-enqueue.js";
import { getDecryptedWebhookToken } from "../../../database/discord/webhook-tokens/get-decrypted.js";
import { validateOperation } from "../../../database/discord/validators/validate-operation.js";
import { renderAutoHook } from "../../body-renderers/render-auto-hook.js";
import { getSamplePayload, SAMPLE_RSN } from "../../body-renderers/sample-payloads.js";
import {
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_NOT_FOUND,
    HTTP_OK,
} from "../../../shared/http/http-status.js";

const RATE_LIMIT_ROUTE = "/guilds/:id";
const CLANSOCKET_PERMISSION = "discord:auto-hooks.update";
const TARGET_KIND = "webhook_post";
const TEST_PREFIX = "[TEST] ";

interface TestSendBody {
    userId: string;
    autoHookId: string | null;
    autoHookName: string;
    triggerType: string;
    webhookId: string;
    contentTemplate: string | null;
    useEmbed: boolean;
    embedTemplateJson: string | null;
    conditionsJson: string | null;
    webhookUsernameOverride: string | null;
    webhookAvatarUrlOverride: string | null;
}

function buildDraftRow(guildId: string, body: TestSendBody, webhookId: string): AutoHookRow {
    return {
        auto_hook_id: "test-send",
        auto_hook_name: TEST_PREFIX + body.autoHookName,
        guild_id: guildId,
        trigger_type: body.triggerType,
        webhook_id: webhookId,
        content_template: body.contentTemplate,
        use_embed: body.useEmbed ? 1 : 0,
        embed_template_json: body.embedTemplateJson,
        conditions_json: body.conditionsJson,
        enabled: 1,
        webhook_username_override: body.webhookUsernameOverride,
        webhook_avatar_url_override: body.webhookAvatarUrlOverride,
        created_by_account_id: body.userId,
        created_by_account_name: null,
        created_at: Date.now(),
        updated_at: Date.now(),
    };
}

function resolveEffectiveWebhookId(clanId: string, guildId: string, body: TestSendBody): string {
    if (body.autoHookId !== null && body.autoHookId.length > 0) {
        const row = getAutoHookById(clanId, guildId, body.autoHookId);
        if (row !== null) return row.webhook_id;
    }
    return body.webhookId;
}

const router: Router = Router();

router.post(
    "/:guildId/test-send",
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const server = resolveServerByGuildId(guildId);
        if (!server) {
            res.status(HTTP_BAD_REQUEST).json({ error: "guild_not_bound" });
            return;
        }
        const body = req.body as TestSendBody;
        const validation = validateOperation(
            { requiredClansocketPermission: CLANSOCKET_PERMISSION, rateLimitRoute: RATE_LIMIT_ROUTE },
            { botId: server.bot_id, clanId: server.clan_id, guildId, userId: body.userId },
        );
        if (!validation.ok) {
            res.status(HTTP_FORBIDDEN).json({ error: "validation_failed", failures: validation.failures });
            return;
        }
        try {
            const effectiveWebhookId = resolveEffectiveWebhookId(server.clan_id, guildId, body);
            maybeHealWebhook({
                botId: server.bot_id,
                clanId: server.clan_id,
                guildId,
                webhookId: effectiveWebhookId,
            });
            const token = getDecryptedWebhookToken(server.clan_id, guildId, effectiveWebhookId);
            if (token === null) {
                res.status(HTTP_NOT_FOUND).json({ error: "webhook_token_missing" });
                return;
            }
            const draft = buildDraftRow(guildId, body, effectiveWebhookId);
            const samplePayload = {
                ...getSamplePayload(body.triggerType),
                accountType: "ironman",
                combatLevel: 126,
                totalLevel: 2277,
                clanMemberCount: 47,
                eventReceivedAt: Date.now(),
            };
            const envelope = renderAutoHook(draft, samplePayload, {
                rsn: SAMPLE_RSN,
                clanName: server.clan_name ?? null,
                botId: server.bot_id,
            });
            if (envelope === null) {
                res.status(HTTP_BAD_REQUEST).json({ error: "unsupported_trigger" });
                return;
            }
            const queueId = enqueueOutboundEvent({
                botId: server.bot_id,
                botName: null,
                guildId,
                clanId: server.clan_id,
                targetKind: TARGET_KIND,
                targetId: effectiveWebhookId,
                targetName: TEST_PREFIX + body.autoHookName,
                payload: { envelope, webhookId: effectiveWebhookId, token },
            });
            res.status(HTTP_OK).json({ ok: true, queueId });
        } catch (err) {
            logger.error(`[discord] auto-hook test-send failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "test_send_failed" });
        }
    }),
);

export default router;

import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync, validateGuildId } from "../../../api/middleware.js";
import { ClanAuditActions } from "../../../database/clans/audit/clan-audit-actions.js";
import { recordClanAudit } from "../../../database/clans/audit/clan-audit-helpers/record.js";
import { upsertAutoHook } from "../../../database/discord/auto-hooks/upsert.js";
import { maybeHealWebhook } from "../../../database/discord/webhook-heal/check-and-enqueue.js";
import { resolveServerByGuildId } from "../../../database/discord/resolve-server.js";
import { validateOperation } from "../../../database/discord/validators/validate-operation.js";
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_INTERNAL_ERROR, HTTP_OK } from "../../../shared/http/http-status.js";

const RATE_LIMIT_ROUTE = "/guilds/:id";
const CLANSOCKET_PERMISSION = "discord:auto-hooks.update";

interface UpdateBody {
    userId: string;
    userName: string | null;
    autoHookName: string;
    triggerType: string;
    webhookId: string;
    contentTemplate: string | null;
    useEmbed: boolean;
    embedTemplateJson: string | null;
    conditionsJson: string | null;
    enabled: boolean;
    webhookUsernameOverride: string | null;
    webhookAvatarUrlOverride: string | null;
}

const router: Router = Router();

router.patch(
    "/:guildId/:autoHookId",
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const autoHookId = req.params.autoHookId as string;
        const server = resolveServerByGuildId(guildId);
        if (!server) {
            res.status(HTTP_BAD_REQUEST).json({ error: "guild_not_bound" });
            return;
        }
        const body = req.body as UpdateBody;
        const validation = validateOperation(
            { requiredClansocketPermission: CLANSOCKET_PERMISSION, rateLimitRoute: RATE_LIMIT_ROUTE },
            { botId: server.bot_id, clanId: server.clan_id, guildId, userId: body.userId },
        );
        if (!validation.ok) {
            res.status(HTTP_FORBIDDEN).json({ error: "validation_failed", failures: validation.failures });
            return;
        }
        try {
            upsertAutoHook({
                clanId: server.clan_id,
                guildId,
                autoHookId,
                autoHookName: body.autoHookName,
                triggerType: body.triggerType,
                webhookId: body.webhookId,
                contentTemplate: body.contentTemplate,
                useEmbed: body.useEmbed,
                embedTemplateJson: body.embedTemplateJson,
                conditionsJson: body.conditionsJson,
                enabled: body.enabled,
                webhookUsernameOverride: body.webhookUsernameOverride,
                webhookAvatarUrlOverride: body.webhookAvatarUrlOverride,
                createdByAccountId: body.userId,
                createdByAccountName: body.userName,
            });
            maybeHealWebhook({
                botId: server.bot_id,
                clanId: server.clan_id,
                guildId,
                webhookId: body.webhookId,
            });
            recordClanAudit(server.clan_id, {
                actor: body.userId,
                action: ClanAuditActions.DiscordAutoHookUpdated,
                targetId: autoHookId,
                guildId,
                payload: {
                    guildId,
                    targetName: body.autoHookName,
                    autoHookId,
                    autoHookName: body.autoHookName,
                },
            });
            res.status(HTTP_OK).json({ ok: true });
        } catch (err) {
            logger.error(`[discord] auto-hook update failed for ${autoHookId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "auto_hook_update_failed" });
        }
    }),
);

export default router;

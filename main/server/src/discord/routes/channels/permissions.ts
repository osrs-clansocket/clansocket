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
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_INTERNAL_ERROR, HTTP_OK } from "../../../shared/http/http-status.js";

const TARGET_KIND = "discord_channel";
const OP_KIND_UPDATE = "update";
const RATE_LIMIT_ROUTE = "/channels/:id/permissions/:overwriteId";
const CLANSOCKET_PERMISSION = "discord:channels.set-permissions";
const SUBJECT_PERMISSIONS = "permissions";

interface SetPermissionsBody {
    userId: string;
    channelName: string;
    overwriteKind: "role" | "member";
    overwriteTargetId: string;
    overwriteTargetName: string;
    allow: string;
    deny: string;
}

const router: Router = Router();

router.post(
    "/:guildId/:channelId/permissions",
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const channelId = req.params.channelId as string;
        const server = resolveServerByGuildId(guildId);
        if (!server) {
            res.status(HTTP_BAD_REQUEST).json({ error: "guild_not_bound" });
            return;
        }
        const body = req.body as SetPermissionsBody;
        const validation = validateOperation(
            { requiredClansocketPermission: CLANSOCKET_PERMISSION, rateLimitRoute: RATE_LIMIT_ROUTE },
            { botId: server.bot_id, clanId: server.clan_id, guildId, userId: body.userId },
        );
        if (!validation.ok) {
            res.status(HTTP_FORBIDDEN).json({ error: "validation_failed", failures: validation.failures });
            return;
        }
        try {
            const sessionId = openDraftSession({ clanId: server.clan_id, guildId, ownerSiteAccountId: body.userId });
            const afterJson = JSON.stringify({
                subject: SUBJECT_PERMISSIONS,
                overwriteKind: body.overwriteKind,
                overwriteTargetId: body.overwriteTargetId,
                allow: body.allow,
                deny: body.deny,
            });
            const changeId = enqueueDraftChange({
                clanId: server.clan_id,
                guildId,
                sessionId,
                opKind: OP_KIND_UPDATE,
                targetKind: TARGET_KIND,
                targetIdOrTemp: channelId,
                afterJson,
                beforeJson: JSON.stringify({ subject: SUBJECT_PERMISSIONS }),
            });
            const queueId = publishSingleOpDraft({ clanId: server.clan_id, guildId, sessionId });
            recordClanAudit(server.clan_id, {
                actor: body.userId,
                action: ClanAuditActions.DiscordChannelsSetPermissions,
                targetId: channelId,
                guildId,
                payload: {
                    guildId,
                    targetName: body.channelName,
                    overwriteKind: body.overwriteKind,
                    overwriteTargetId: body.overwriteTargetId,
                    overwriteTargetName: body.overwriteTargetName,
                    allow: body.allow,
                    deny: body.deny,
                },
            });
            res.status(HTTP_OK).json({ sessionId, changeId, queueId });
        } catch (err) {
            logger.error(
                `[discord] set channel permissions failed for ${guildId}/${channelId}: ${(err as Error).message}`,
            );
            res.status(HTTP_INTERNAL_ERROR).json({ error: "set_channel_permissions_failed" });
        }
    }),
);

export default router;

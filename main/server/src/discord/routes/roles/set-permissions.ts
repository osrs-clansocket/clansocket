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

const TARGET_KIND = "discord_role";
const OP_KIND_UPDATE = "update";
const RATE_LIMIT_ROUTE = "/guilds/:id/roles/:roleId";
const CLANSOCKET_PERMISSION = "discord:roles.set-permissions";
const SUBJECT_PERMISSIONS = "permissions";

interface SetRolePermissionsBody {
    userId: string;
    roleName: string;
    beforePermissions: string;
    afterPermissions: string;
}

const router: Router = Router();

router.post(
    "/:guildId/:roleId/permissions",
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const roleId = req.params.roleId as string;
        const server = resolveServerByGuildId(guildId);
        if (!server) {
            res.status(HTTP_BAD_REQUEST).json({ error: "guild_not_bound" });
            return;
        }
        const body = req.body as SetRolePermissionsBody;
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
            const changeId = enqueueDraftChange({
                clanId: server.clan_id,
                guildId,
                sessionId,
                opKind: OP_KIND_UPDATE,
                targetKind: TARGET_KIND,
                targetIdOrTemp: roleId,
                beforeJson: JSON.stringify({ subject: SUBJECT_PERMISSIONS, permissions: body.beforePermissions }),
                afterJson: JSON.stringify({ subject: SUBJECT_PERMISSIONS, permissions: body.afterPermissions }),
            });
            const queueId = publishSingleOpDraft({ clanId: server.clan_id, guildId, sessionId });
            recordClanAudit(server.clan_id, {
                actor: body.userId,
                action: ClanAuditActions.DiscordRolesSetPermissions,
                targetId: roleId,
                guildId,
                payload: {
                    guildId,
                    targetName: body.roleName,
                    beforePermissions: body.beforePermissions,
                    afterPermissions: body.afterPermissions,
                },
            });
            res.status(HTTP_OK).json({ sessionId, changeId, queueId });
        } catch (err) {
            logger.error(`[discord] set role permissions failed for ${guildId}/${roleId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "set_role_permissions_failed" });
        }
    }),
);

export default router;

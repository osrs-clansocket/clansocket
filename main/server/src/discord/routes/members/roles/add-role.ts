import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync, validateGuildId } from "../../../../api/middleware.js";
import { ClanAuditActions } from "../../../../database/clans/audit/clan-audit-actions.js";
import { recordClanAudit } from "../../../../database/clans/audit/clan-audit-helpers/record.js";
import { enqueueDraftChange } from "../../../../database/discord/drafts/enqueue-change.js";
import { openDraftSession } from "../../../../database/discord/drafts/open-session.js";
import { publishSingleOpDraft } from "../../../../database/discord/publish-queue/publish-single.js";
import { resolveServerByGuildId } from "../../../../database/discord/resolve-server.js";
import { validateOperation } from "../../../../database/discord/validators/validate-operation.js";
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_INTERNAL_ERROR, HTTP_OK } from "../../../../shared/http/http-status.js";

const TARGET_KIND = "discord_member";
const OP_KIND_UPDATE = "update";
const SUBJECT_ADD_ROLE = "add-role";
const RATE_LIMIT_ROUTE = "/guilds/:id/members/:user_id/roles/:role_id";
const CLANSOCKET_PERMISSION = "discord:members.add-role";

interface AddRoleBody {
    userId: string;
    targetUserName: string;
    roleName: string;
}

const router: Router = Router();

router.post(
    "/:guildId/:userId/roles/:roleId",
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const targetUserId = req.params.userId as string;
        const roleId = req.params.roleId as string;
        const server = resolveServerByGuildId(guildId);
        if (!server) {
            res.status(HTTP_BAD_REQUEST).json({ error: "guild_not_bound" });
            return;
        }
        const body = req.body as AddRoleBody;
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
            const afterJson = JSON.stringify({
                subject: SUBJECT_ADD_ROLE,
                targetUserId,
                roleId,
            });
            const changeId = enqueueDraftChange({
                clanId: server.clan_id,
                guildId,
                sessionId,
                opKind: OP_KIND_UPDATE,
                targetKind: TARGET_KIND,
                targetIdOrTemp: targetUserId,
                afterJson,
            });
            const queueId = publishSingleOpDraft({ clanId: server.clan_id, guildId, sessionId });
            recordClanAudit(server.clan_id, {
                actor: body.userId,
                action: ClanAuditActions.DiscordMembersAddRole,
                targetId: targetUserId,
                guildId,
                payload: {
                    guildId,
                    userId: targetUserId,
                    userName: body.targetUserName,
                    roleId,
                    roleName: body.roleName,
                },
            });
            res.status(HTTP_OK).json({ sessionId, changeId, queueId });
        } catch (err) {
            logger.error(`[discord] members add-role failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "add_role_failed" });
        }
    }),
);

export default router;

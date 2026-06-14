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
import {
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_OK,
} from "../../../../shared/http/http-status.js";

const TARGET_KIND = "discord_member";
const OP_KIND_DELETE = "delete";
const SUBJECT_BAN = "ban";
const RATE_LIMIT_ROUTE = "/guilds/:id/bans/:user_id";
const CLANSOCKET_PERMISSION = "discord:members.ban";

interface BanBody {
    userId: string;
    targetUserName: string;
    reason?: string;
    deleteMessageDays?: number;
}

const router: Router = Router();

router.post(
    "/:guildId/:userId/ban",
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const targetUserId = req.params.userId as string;
        const server = resolveServerByGuildId(guildId);
        if (!server) {
            res.status(HTTP_BAD_REQUEST).json({ error: "guild_not_bound" });
            return;
        }
        const body = req.body as BanBody;
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
                subject: SUBJECT_BAN,
                targetUserId,
                reason: body.reason ?? null,
                deleteMessageDays: body.deleteMessageDays ?? null,
            });
            const changeId = enqueueDraftChange({
                clanId: server.clan_id,
                guildId,
                sessionId,
                opKind: OP_KIND_DELETE,
                targetKind: TARGET_KIND,
                targetIdOrTemp: targetUserId,
                afterJson,
            });
            const queueId = publishSingleOpDraft({ clanId: server.clan_id, guildId, sessionId });
            recordClanAudit(server.clan_id, {
                actor: body.userId,
                action: ClanAuditActions.DiscordMembersBan,
                targetId: targetUserId,
                guildId,
                payload: {
                    guildId,
                    userId: targetUserId,
                    userName: body.targetUserName,
                    reason: body.reason,
                    deleteMessageDays: body.deleteMessageDays,
                },
            });
            res.status(HTTP_OK).json({ sessionId, changeId, queueId });
        } catch (err) {
            logger.error(`[discord] members ban failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "ban_failed" });
        }
    }),
);

export default router;

import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync, validateGuildId } from "../../../api/middleware.js";
import { ClanAuditActions } from "../../../database/clans/audit/clan-audit-actions.js";
import { recordClanAudit } from "../../../database/clans/audit/clan-audit-helpers/record.js";
import { deleteAutoHook } from "../../../database/discord/auto-hooks/delete.js";
import { resolveServerByGuildId } from "../../../database/discord/resolve-server.js";
import { validateOperation } from "../../../database/discord/validators/validate-operation.js";
import {
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_NOT_FOUND,
    HTTP_OK,
} from "../../../shared/http/http-status.js";

const RATE_LIMIT_ROUTE = "/guilds/:id";
const CLANSOCKET_PERMISSION = "discord:auto-hooks.delete";

interface DeleteBody {
    userId: string;
    autoHookName: string;
}

const router: Router = Router();

router.delete(
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
        const body = req.body as DeleteBody;
        const validation = validateOperation(
            { requiredClansocketPermission: CLANSOCKET_PERMISSION, rateLimitRoute: RATE_LIMIT_ROUTE },
            { botId: server.bot_id, clanId: server.clan_id, guildId, userId: body.userId },
        );
        if (!validation.ok) {
            res.status(HTTP_FORBIDDEN).json({ error: "validation_failed", failures: validation.failures });
            return;
        }
        try {
            const ok = deleteAutoHook(server.clan_id, guildId, autoHookId);
            if (!ok) {
                res.status(HTTP_NOT_FOUND).json({ error: "auto_hook_not_found" });
                return;
            }
            recordClanAudit(server.clan_id, {
                actor: body.userId,
                action: ClanAuditActions.DiscordAutoHookDeleted,
                targetId: autoHookId,
                guildId,
                payload: {
                    guildId,
                    targetName: body.autoHookName,
                    autoHookId,
                },
            });
            res.status(HTTP_OK).json({ ok: true });
        } catch (err) {
            logger.error(`[discord] auto-hook delete failed for ${autoHookId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "auto_hook_delete_failed" });
        }
    }),
);

export default router;

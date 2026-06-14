import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { listForUser } from "../../../database/discord/user-permissions/list.js";
import { setForUser } from "../../../database/discord/user-permissions/set.js";
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";

const SYSTEM_GRANTER = "_system";

const router: Router = Router();

router.get(
    "/:guildId/:userId",
    authenticate,
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const userId = req.params.userId as string;
        try {
            const clanId = resolveClanIdForGuild(guildId);
            if (!clanId) {
                res.status(HTTP_NOT_FOUND).json({ error: "guild_not_registered" });
                return;
            }
            const permissions = listForUser(clanId, guildId, userId);
            res.json({ permissions });
        } catch (err) {
            logger.error(`[discord] list permissions failed for ${guildId}/${userId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "list_permissions_failed" });
        }
    }),
);

router.put(
    "/:guildId/:userId",
    authenticate,
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const userId = req.params.userId as string;
        const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : null;
        if (!permissions) {
            res.status(HTTP_BAD_REQUEST).json({ error: "permissions_array_required" });
            return;
        }
        try {
            const clanId = resolveClanIdForGuild(guildId);
            if (!clanId) {
                res.status(HTTP_NOT_FOUND).json({ error: "guild_not_registered" });
                return;
            }
            setForUser({
                clanId,
                guildId,
                userId,
                permissions,
                grantedBySiteAccountId: SYSTEM_GRANTER,
                grantedBySiteAccountName: null,
            });
            res.json({ ok: true });
        } catch (err) {
            logger.error(`[discord] set permissions failed for ${guildId}/${userId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "set_permissions_failed" });
        }
    }),
);

export default router;

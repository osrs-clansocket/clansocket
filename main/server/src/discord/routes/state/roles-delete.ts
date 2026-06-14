import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { deleteRole } from "../../../database/discord/state/roles/delete-role.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.delete(
    "/roles/:guildId/:roleId",
    authenticate,
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const roleId = req.params.roleId as string;
        const clanId = resolveClanIdForGuild(guildId);
        if (!clanId) {
            res.status(HTTP_NOT_FOUND).json({ error: "guild_not_bound" });
            return;
        }
        try {
            deleteRole(clanId, guildId, roleId);
            res.status(HTTP_OK).json({ ok: true });
        } catch (err) {
            logger.error(`[discord] role delete failed for ${guildId}/${roleId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "role_delete_failed" });
        }
    }),
);

export default router;

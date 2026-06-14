import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { upsertRole } from "../../../database/discord/state/roles/upsert-role.js";
import type { RoleRow } from "../../../database/discord/state/types.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

interface UpsertBody {
    role: RoleRow;
}

const router: Router = Router();

router.post(
    "/roles/:guildId/:roleId",
    authenticate,
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const clanId = resolveClanIdForGuild(guildId);
        if (!clanId) {
            res.status(HTTP_NOT_FOUND).json({ error: "guild_not_bound" });
            return;
        }
        const body = req.body as UpsertBody;
        try {
            upsertRole(clanId, guildId, body.role);
            res.status(HTTP_OK).json({ ok: true });
        } catch (err) {
            logger.error(`[discord] role upsert failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "role_upsert_failed" });
        }
    }),
);

export default router;

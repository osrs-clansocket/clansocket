import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { deleteMember } from "../../../database/discord/state/members/delete-member.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.delete(
    "/members/:guildId/:userId",
    authenticate,
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const userId = req.params.userId as string;
        const clanId = resolveClanIdForGuild(guildId);
        if (!clanId) {
            res.status(HTTP_NOT_FOUND).json({ error: "guild_not_bound" });
            return;
        }
        try {
            deleteMember(clanId, guildId, userId);
            res.status(HTTP_OK).json({ ok: true });
        } catch (err) {
            logger.error(`[discord] member delete failed for ${guildId}/${userId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "member_delete_failed" });
        }
    }),
);

export default router;

import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync, validateGuildId } from "../../../api/middleware.js";
import { getConditionValueOptions } from "../../../database/discord/auto-hook-conditions/value-options.js";
import { resolveServerByGuildId } from "../../../database/discord/resolve-server.js";
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR, HTTP_OK } from "../../../shared/http/http-status.js";

const router: Router = Router();

router.get(
    "/:guildId",
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const triggerType = typeof req.query.trigger === "string" ? req.query.trigger : "";
        const field = typeof req.query.field === "string" ? req.query.field : "";
        if (triggerType.length === 0 || field.length === 0) {
            res.status(HTTP_BAD_REQUEST).json({ error: "missing_params" });
            return;
        }
        const server = resolveServerByGuildId(guildId);
        if (!server) {
            res.status(HTTP_BAD_REQUEST).json({ error: "guild_not_bound" });
            return;
        }
        try {
            const values = getConditionValueOptions(server.clan_id, triggerType, field);
            res.status(HTTP_OK).json({ values });
        } catch (err) {
            logger.error(
                `[discord] condition value-options failed (${triggerType}.${field}): ${(err as Error).message}`,
            );
            res.status(HTTP_INTERNAL_ERROR).json({ error: "value_options_failed" });
        }
    }),
);

export default router;

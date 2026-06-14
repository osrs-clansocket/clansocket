import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync, validateGuildId } from "../../../../api/middleware.js";
import { updateServerFeatures } from "../../../../database/discord/servers/update-features.js";
import { HTTP_INTERNAL_ERROR, HTTP_OK } from "../../../../shared/http/http-status.js";

interface FeaturesBody {
    features: string[];
}

const router: Router = Router();

router.post(
    "/servers/:guildId/features",
    authenticate,
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const guildId = req.params.guildId as string;
        const body = req.body as FeaturesBody;
        try {
            updateServerFeatures(guildId, body.features);
            res.status(HTTP_OK).json({ ok: true, count: body.features.length });
        } catch (err) {
            logger.error(`[discord] features sync failed for ${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "features_sync_failed" });
        }
    }),
);

export default router;

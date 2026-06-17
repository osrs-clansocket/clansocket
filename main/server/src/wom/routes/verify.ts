import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../api/middleware.js";
import { requireSiteAccountId } from "../../auth/site-routes/oauth-helpers.js";
import { isClanManager } from "../../database/clans/access/clan-manager-helpers.js";
import { getClanBySlug } from "../../database/index.js";
import {
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_NOT_FOUND,
} from "../../shared/http/http-status.js";
import { buildDefaultWomUserAgent } from "../builders/wom-default-ua-builder.js";
import { validateWomPayload } from "../validators/wom-payload-validator.js";
import { verifyWomCredentials } from "../verifiers/wom-credentials-verifier.js";

function fillUserAgentDefault(payload: unknown, clanId: string): unknown {
    if (typeof payload !== "object" || payload === null) return payload;
    const p = payload as Record<string, unknown>;
    if (p.user_agent !== undefined) return payload;
    return { ...p, user_agent: buildDefaultWomUserAgent(clanId) };
}

const router: Router = Router();

router.post(
    "/:slug/verify",
    handleAsync(async (req: Request, res: Response) => {
        const sid = requireSiteAccountId(req, res);
        if (!sid) return;
        const slug = (req.params.slug as string).toLowerCase();
        try {
            const clan = getClanBySlug(slug);
            if (!clan) {
                res.status(HTTP_NOT_FOUND).json({ error: "clan_not_found" });
                return;
            }
            if (!isClanManager(sid, clan.id)) {
                res.status(HTTP_FORBIDDEN).json({ error: "not_clan_manager" });
                return;
            }
            const payload = fillUserAgentDefault(req.body as unknown, clan.id);
            if (!validateWomPayload(payload)) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: "invalid_payload" });
                return;
            }
            const result = await verifyWomCredentials(payload);
            if (result.status !== "ok") {
                res.json({ ok: false, reason: result.status });
                return;
            }
            res.json({ ok: true, public_metadata: result.public_metadata });
        } catch (err) {
            logger.error(`[wom] verify failed slug=${slug}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "verify_failed" });
        }
    }),
);

export default router;

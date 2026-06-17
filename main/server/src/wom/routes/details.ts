import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { WOMClient } from "@wise-old-man/utils";
import { handleAsync } from "../../api/middleware.js";
import { requireSiteAccountId } from "../../auth/site-routes/oauth-helpers.js";
import { readVaultEntry } from "../../clan-vault/index.js";
import { isClanManager } from "../../database/clans/access/clan-manager-helpers.js";
import { getClanWomIdentity } from "../../database/wom/identity/get-clan-wom-identity.js";
import { getClanBySlug } from "../../database/index.js";
import {
    HTTP_BAD_GATEWAY,
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_NOT_FOUND,
    HTTP_TOO_MANY_REQUESTS,
} from "../../shared/http/http-status.js";
import type { WomPayload } from "../types/wom-types.js";
import { validateWomPayload } from "../validators/wom-payload-validator.js";

interface SdkError {
    statusCode?: number;
    message?: string;
}

const router: Router = Router();

router.get(
    "/:slug/details",
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
            const identity = getClanWomIdentity(clan.id);
            if (!identity) {
                res.status(HTTP_NOT_FOUND).json({ error: "no_wom_linked" });
                return;
            }
            const creds = await readVaultEntry<WomPayload>(
                clan.id,
                "wom",
                { kind: "system", component: "wom-details-route" },
                validateWomPayload,
            );
            if (!creds) {
                res.status(HTTP_NOT_FOUND).json({ error: "no_wom_credentials" });
                return;
            }
            const client = new WOMClient({ apiKey: creds.api_key, userAgent: creds.user_agent });
            try {
                const details = await client.groups.getGroupDetails(identity.wom_group_id);
                if (details === undefined) {
                    res.status(HTTP_BAD_GATEWAY).json({ error: "wom_upstream_unhandled_status" });
                    return;
                }
                res.json(details);
            } catch (err) {
                const sdkErr = err as SdkError;
                const statusCode = sdkErr.statusCode ?? HTTP_BAD_GATEWAY;
                if (statusCode === HTTP_TOO_MANY_REQUESTS) {
                    res.status(HTTP_TOO_MANY_REQUESTS).json({ error: "wom_rate_limited" });
                    return;
                }
                logger.warn(`[wom] details fetch failed slug=${slug} status=${statusCode}: ${sdkErr.message ?? ""}`);
                res.status(HTTP_BAD_GATEWAY).json({ error: "wom_upstream_failed", status: statusCode });
            }
        } catch (err) {
            logger.error(`[wom] details failed slug=${slug}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "details_failed" });
        }
    }),
);

export default router;

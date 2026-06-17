import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../api/middleware.js";
import { requireSiteAccountId } from "../../auth/site-routes/oauth-helpers.js";
import { readVaultEntry } from "../../clan-vault/index.js";
import { isClanManager } from "../../database/clans/access/clan-manager-helpers.js";
import { getClanWomIdentity } from "../../database/wom/identity/get-clan-wom-identity.js";
import { enqueueWomRequest } from "../../database/wom/outbound/enqueue.js";
import { getClanBySlug } from "../../database/index.js";
import { HTTP_ACCEPTED, HTTP_FORBIDDEN, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../shared/http/http-status.js";
import { scheduleWomWakeForClan } from "../dispatcher/wom-dispatcher.js";
import type { WomPayload } from "../types/wom-types.js";
import { validateWomPayload } from "../validators/wom-payload-validator.js";

const REQUEST_KIND_VERIFY = "verify-credentials";

const router: Router = Router();

router.post(
    "/:slug/update-now",
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
                { kind: "user", user_id: sid },
                validateWomPayload,
            );
            if (!creds) {
                res.status(HTTP_NOT_FOUND).json({ error: "no_wom_credentials" });
                return;
            }
            const queueId = enqueueWomRequest({
                clanId: clan.id,
                requestKind: REQUEST_KIND_VERIFY,
                requestPath: `/groups/${identity.wom_group_id}/update-all`,
                requestMethod: "POST",
                body: { verificationCode: creds.verification_code },
                scheduledAtMs: Date.now(),
            });
            scheduleWomWakeForClan(clan.id, Date.now());
            res.status(HTTP_ACCEPTED).json({ ok: true, queue_id: queueId });
        } catch (err) {
            logger.error(`[wom] update-now failed slug=${slug}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "update_now_failed" });
        }
    }),
);

export default router;

import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../api/middleware.js";
import { requireSiteAccountId } from "../../auth/site-routes/oauth-helpers.js";
import { isActorClanOwner } from "../../clansocket/auth/clan-owner-lookup.js";
import { isClanManager } from "../../database/clans/access/clan-manager-helpers.js";
import { ClanAuditActions } from "../../database/clans/audit/clan-audit-actions.js";
import { recordClanAudit } from "../../database/clans/audit/clan-audit-helpers/record.js";
import { getClanWomIdentity } from "../../database/wom/identity/get-clan-wom-identity.js";
import { reassignClanWomLinker } from "../../database/wom/identity/reassign-clan-wom-linker.js";
import { getClanBySlug, getSiteAccountById } from "../../database/index.js";
import {
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_NOT_FOUND,
} from "../../shared/http/http-status.js";

interface ReassignRequestBody {
    new_linker_user_id?: string;
}

const router: Router = Router();

router.post(
    "/:slug/reassign-linker",
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
            if (!isActorClanOwner(sid, clan.id)) {
                res.status(HTTP_FORBIDDEN).json({ error: "not_clan_owner" });
                return;
            }
            const body = req.body as ReassignRequestBody;
            const newLinkerUserId = body.new_linker_user_id;
            if (typeof newLinkerUserId !== "string" || newLinkerUserId.length === 0) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: "missing_new_linker_user_id" });
                return;
            }
            if (!isClanManager(newLinkerUserId, clan.id)) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: "not_a_current_clan_manager" });
                return;
            }
            const existing = getClanWomIdentity(clan.id);
            if (!existing) {
                res.status(HTTP_NOT_FOUND).json({ error: "no_wom_linked" });
                return;
            }
            const previousLinker = existing.linker_site_account_id;
            const reassigned = reassignClanWomLinker(clan.id, newLinkerUserId);
            if (!reassigned) {
                res.status(HTTP_INTERNAL_ERROR).json({ error: "reassign_failed" });
                return;
            }
            recordClanAudit(clan.id, {
                actor: sid,
                actorKind: "user",
                action: ClanAuditActions.WomLinkLinkerReassigned,
                targetId: String(existing.wom_group_id),
                payload: {
                    previous_linker: previousLinker,
                    new_linker: newLinkerUserId,
                    by_owner: sid,
                },
            });
            const newLinkerAccount = getSiteAccountById(newLinkerUserId);
            res.json({
                ok: true,
                new_linker: {
                    user_id: newLinkerUserId,
                    display_name: newLinkerAccount?.display_name ?? newLinkerUserId,
                },
            });
        } catch (err) {
            logger.error(`[wom] reassign-linker failed slug=${slug}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "reassign_failed" });
        }
    }),
);

export default router;

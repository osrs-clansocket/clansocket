import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../api/middleware.js";
import { requireSiteAccountId } from "../../auth/site-routes/oauth-helpers.js";
import { listVaultEntryKeys } from "../../clan-vault/index.js";
import type { Actor } from "../../clan-vault/shared/vault-types.js";
import { isClanManager } from "../../database/clans/access/clan-manager-helpers.js";
import { getClanWomIdentity } from "../../database/wom/identity/get-clan-wom-identity.js";
import { listRsnsForSiteAccount } from "../../database/site/rsn/state.js";
import { getClanBySlug } from "../../database/index.js";
import { HTTP_FORBIDDEN, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../shared/http/http-status.js";

const ENTRY_KEY_WOM = "wom";

interface WomStatusResponse {
    linked: boolean;
    linker_site_account_id: string | null;
    linker_rsn: string | null;
    linker_rank: string | null;
    wom_group_id: number | null;
    cached_group_name: string | null;
    last_verified_at: number | null;
    last_verified_status: string | null;
    last_backfill_at: number | null;
    last_backfill_status: string | null;
    next_backfill_eligible_at: number | null;
}

interface ResolvedLinker {
    rsn: string | null;
    rank: string | null;
}

function emptyStatus(): WomStatusResponse {
    return {
        linked: false,
        linker_site_account_id: null,
        linker_rsn: null,
        linker_rank: null,
        wom_group_id: null,
        cached_group_name: null,
        last_verified_at: null,
        last_verified_status: null,
        last_backfill_at: null,
        last_backfill_status: null,
        next_backfill_eligible_at: null,
    };
}

function resolveLinkerIdentity(siteAccountId: string): ResolvedLinker {
    const rows = listRsnsForSiteAccount(siteAccountId);
    if (rows.length === 0) return { rsn: null, rank: null };
    const row = rows[0];
    return { rsn: row.rsn, rank: row.current_rank };
}

const router: Router = Router();

router.get(
    "/:slug",
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
                res.json(emptyStatus());
                return;
            }
            const actor: Actor = { kind: "user", user_id: sid };
            const vaultEntries = await listVaultEntryKeys(clan.id, actor);
            const womEntry = vaultEntries.find((e) => e.entry_key === ENTRY_KEY_WOM);
            const linker = resolveLinkerIdentity(identity.linker_site_account_id);
            res.json({
                linked: true,
                linker_site_account_id: identity.linker_site_account_id,
                linker_rsn: linker.rsn,
                linker_rank: linker.rank,
                wom_group_id: identity.wom_group_id,
                cached_group_name: identity.cached_group_name,
                last_verified_at: womEntry?.last_verified_at ?? null,
                last_verified_status: womEntry?.last_verified_status ?? null,
                last_backfill_at: identity.last_backfill_at,
                last_backfill_status: identity.last_backfill_status,
                next_backfill_eligible_at: identity.next_backfill_eligible_at,
            } satisfies WomStatusResponse);
        } catch (err) {
            logger.error(`[wom] status failed slug=${slug}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "status_failed" });
        }
    }),
);

export default router;

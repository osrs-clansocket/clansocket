import { ERROR_CLAN_NOT_FOUND } from "../../shared/error-reasons.js";
import { HTTP_FORBIDDEN, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../shared/http/http-status.js";
import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { ClanAuditActions, DB_NAMES, getClanBySlug, getDb, recordClanAudit } from "../../database/index.js";
import { lookupVerifiedRsnForHash } from "../../database/plugin/plugin-rsn-lookup.js";
import { insertClanManager } from "../../database/clans/access/clan-manager-helpers.js";
import {
    bindSiteAccountAccountHash,
    listAccountHashesForSiteAccount,
} from "../../database/site/site-account-helpers/index.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import {
    findSessionsByAccountHash,
    requestReidentifyAndAwait,
    type PluginLiveSession,
} from "../../plugin-api/session/session-registry/index.js";
import { purgeClanData } from "../../data-rights/purge/purge-clan.js";
import { recordAction } from "../../data-rights/cooldown.js";
import { ACTION_CLAN_DELETED } from "../../data-rights/scopes/action-kinds.js";
import {
    CLAIM_MESSAGE_INTERNAL,
    CLAIM_MESSAGE_NO_LIVE_PLUGIN,
    CLAIM_MESSAGE_NOT_ACTUAL_OWNER_PREFIX,
    CLAIM_MESSAGE_WRONG_RSN_OR_CLAN,
    CLAIM_RANK_OWNER,
    CLAIM_REASON_INTERNAL,
    CLAIM_REASON_NO_LIVE_PLUGIN,
    CLAIM_REASON_NOT_ACTUAL_OWNER,
    CLAIM_REASON_WRONG_RSN_OR_CLAN,
    CLAIM_REIDENTIFY_TIMEOUT_MS,
} from "../../auth/claim-messages.js";
import { loadOwnedClan } from "../load-owned-clan.js";

const router = Router();

function applyTransfer(clanId: string, newOwnerSiteAccountId: string, newOwnerAccountHash: string): void {
    const db = getDb(DB_NAMES.APP);
    const now = Date.now();
    const prior = db.prepare(`SELECT owner_site_account_id FROM clansocket_clans WHERE id = ?`).get(clanId) as
        | { owner_site_account_id: string | null }
        | undefined;
    const newOwnerRsn = lookupVerifiedRsnForHash(newOwnerAccountHash);
    db.prepare(
        `UPDATE clansocket_clans SET owner_site_account_id = ?, owner_account_hash = ?, owner_rsn = ?, claimed_at = ? WHERE id = ?`,
    ).run(newOwnerSiteAccountId, newOwnerAccountHash, newOwnerRsn, now, clanId);
    bindSiteAccountAccountHash(newOwnerSiteAccountId, newOwnerAccountHash);
    insertClanManager(newOwnerSiteAccountId, clanId, "owner", "transfer", newOwnerSiteAccountId);
    recordClanAudit(clanId, {
        actor: prior?.owner_site_account_id ?? null,
        action: ClanAuditActions.ClaimTransferred,
        targetId: clanId,
        payload: { newOwnerSiteAccountId, previousOwnerSiteAccountId: prior?.owner_site_account_id ?? null },
    });
}

router.post("/:slug/transfer-request", requireSiteAccount, async (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const slug = String(req.params.slug ?? "").toLowerCase();
    const clan = getClanBySlug(slug);
    if (!clan || clan.archived_at !== null) {
        res.status(HTTP_NOT_FOUND).json({ ok: false, reason: "clan_not_found" });
        return;
    }
    const boundHashes = listAccountHashesForSiteAccount(siteAccountId);
    if (boundHashes.length === 0) {
        res.status(HTTP_FORBIDDEN).json({
            ok: false,
            reason: CLAIM_REASON_NO_LIVE_PLUGIN,
            message: CLAIM_MESSAGE_NO_LIVE_PLUGIN,
        });
        return;
    }
    const live: PluginLiveSession[] = [];
    for (const hash of boundHashes) {
        const hits = findSessionsByAccountHash(hash);
        for (const hit of hits) live.push(hit);
    }
    if (live.length === 0) {
        res.status(HTTP_FORBIDDEN).json({
            ok: false,
            reason: CLAIM_REASON_NO_LIVE_PLUGIN,
            message: CLAIM_MESSAGE_NO_LIVE_PLUGIN,
        });
        return;
    }
    for (const session of live) {
        await requestReidentifyAndAwait(session.sessionId, CLAIM_REIDENTIFY_TIMEOUT_MS);
    }
    const refreshed: PluginLiveSession[] = [];
    for (const hash of boundHashes) {
        const hits = findSessionsByAccountHash(hash);
        for (const hit of hits) refreshed.push(hit);
    }
    let clanMatch: PluginLiveSession | null = null;
    for (const session of refreshed) {
        if (session.inGameClanId !== clan.id) continue;
        clanMatch = session;
        if (session.inGameClanRank === CLAIM_RANK_OWNER) {
            try {
                applyTransfer(clan.id, siteAccountId, session.accountHash);
                res.json({ ok: true, slug: clan.slug, clanId: clan.id });
                return;
            } catch (err) {
                logger.error(`[clansocket_clans] transfer failed: ${(err as Error).message}`);
                res.status(HTTP_INTERNAL_ERROR).json({
                    ok: false,
                    reason: CLAIM_REASON_INTERNAL,
                    message: CLAIM_MESSAGE_INTERNAL,
                });
                return;
            }
        }
    }
    if (clanMatch) {
        const rank = clanMatch.inGameClanRank ?? "unknown";
        res.status(HTTP_FORBIDDEN).json({
            ok: false,
            reason: CLAIM_REASON_NOT_ACTUAL_OWNER,
            message: `${CLAIM_MESSAGE_NOT_ACTUAL_OWNER_PREFIX}${rank}.`,
        });
        return;
    }
    res.status(HTTP_FORBIDDEN).json({
        ok: false,
        reason: CLAIM_REASON_WRONG_RSN_OR_CLAN,
        message: CLAIM_MESSAGE_WRONG_RSN_OR_CLAN,
    });
});

router.delete("/:slug", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
    if (!owned) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    recordAction(siteAccountId, ACTION_CLAN_DELETED, owned.id);
    const result = purgeClanData(owned.id);
    res.json({ ok: true, ...result });
});

export default router;

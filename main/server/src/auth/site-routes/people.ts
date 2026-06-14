import { HTTP_BAD_REQUEST, HTTP_NOT_FOUND } from "../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import {
    ClanAuditActions,
    createManagerRequest,
    getRosterRank,
    insertClanManager,
    isClanManager,
    isRankWhitelistedForClan,
    listRsnsForSiteAccount,
    recordClanAudit,
    RSN_MAX_LEN,
} from "../../database/index.js";
import { getClanById, getClanBySlug } from "../../database/clans/clan-app-helpers.js";
import { listAccountHashesForSiteAccount } from "../../database/site/site-account-helpers/index.js";
import { findSessionsByAccountHash } from "../../plugin-api/session/session-registry/index.js";
import { requireSiteAccountId } from "./oauth-helpers.js";

const router = Router();

function rejectRequest(res: Response, status: number, reason: string, message: string): void {
    res.status(status).json({ ok: false, reason, message });
}

router.post("/request-management", (req: Request, res: Response) => {
    const siteAccountId = requireSiteAccountId(req, res);
    if (!siteAccountId) return;
    const { clanSlug, declaredRsn } = (req.body ?? {}) as {
        clanSlug?: unknown;
        declaredRsn?: unknown;
    };
    if (typeof clanSlug !== "string" || clanSlug.trim().length === 0) {
        rejectRequest(res, HTTP_BAD_REQUEST, "bad_payload", "Clan is required.");
        return;
    }
    const clan = getClanBySlug(clanSlug.trim().toLowerCase());
    if (!clan || clan.archived_at !== null) {
        rejectRequest(res, HTTP_NOT_FOUND, "clan_not_found", "No such clan.");
        return;
    }
    if (isClanManager(siteAccountId, clan.id)) {
        res.json({ ok: true, alreadyManager: true, slug: clan.slug, clanId: clan.id });
        return;
    }
    const declaredRsnStr = typeof declaredRsn === "string" ? declaredRsn.trim() : "";
    if (declaredRsnStr.length > RSN_MAX_LEN) {
        rejectRequest(res, HTTP_BAD_REQUEST, "bad_payload", `RSN too long (max ${RSN_MAX_LEN}).`);
        return;
    }
    for (const rsnRow of listRsnsForSiteAccount(siteAccountId)) {
        const rank = getRosterRank(clan.id, rsnRow.rsn);
        if (rank === null || !isRankWhitelistedForClan(clan.id, rank)) continue;
        insertClanManager(siteAccountId, clan.id, "manager", "in_game_consent", siteAccountId);
        recordClanAudit(clan.id, {
            actor: siteAccountId,
            action: ClanAuditActions.ManagerGranted,
            targetId: siteAccountId,
            payload: {
                role: "manager",
                grantedVia: "in_game_consent",
                matchedRsn: rsnRow.rsn,
                matchedRank: rank,
            },
        });
        res.json({
            ok: true,
            status: "granted",
            slug: clan.slug,
            clanId: clan.id,
            rsn: rsnRow.rsn,
            rank,
            message: `Verified '${rsnRow.rsn}' has rank '${rank}' in ${clan.display_name}, access granted.`,
        });
        return;
    }
    const request = createManagerRequest({
        siteAccountId,
        clanId: clan.id,
        declaredRsn: declaredRsnStr,
        source: "site",
        declaredAccountHash: null,
        pluginVerified: false,
    });
    recordClanAudit(clan.id, {
        actor: siteAccountId,
        action: ClanAuditActions.ManagerRequestCreated,
        targetId: request.id,
        payload: { declaredRsn: declaredRsnStr, source: "site" },
    });
    res.json({
        ok: true,
        status: "awaiting-owner-approval",
        slug: clan.slug,
        clanId: clan.id,
        requestId: request.id,
        next: "wait for an owner or existing manager to approve ur request from the clan dashboard.",
    });
});

router.get("/sessions", (req: Request, res: Response) => {
    const siteAccountId = requireSiteAccountId(req, res);
    if (!siteAccountId) return;
    const boundHashes = listAccountHashesForSiteAccount(siteAccountId);
    const byHash = [] as ReturnType<typeof findSessionsByAccountHash>;
    for (const hash of boundHashes) {
        const hits = findSessionsByAccountHash(hash);
        for (const hit of hits) byHash.push(hit);
    }
    const seen = new Set<string>();
    const merged = byHash.filter((s) => {
        if (seen.has(s.sessionId)) return false;
        seen.add(s.sessionId);
        return true;
    });
    const out = merged.map((s) => {
        const inGameClan = s.inGameClanId ? getClanById(s.inGameClanId) : null;
        const managerClan = s.managerClanId ? getClanById(s.managerClanId) : null;
        return {
            sessionId: s.sessionId,
            accountHash: s.accountHash,
            rsn: s.rsn,
            world: s.world,
            loginState: s.loginState,
            inGameClanId: s.inGameClanId,
            inGameClanName: inGameClan?.display_name ?? "",
            inGameClanStatus: inGameClan?.status ?? null,
            inGameClanRank: s.inGameClanRank,
            managerClanId: s.managerClanId,
            managerClanName: managerClan?.display_name ?? "",
            managerVerified: s.managerVerified,
            autoVerifyReason: s.autoVerifyReason,
            lastIdentityAt: s.lastIdentityAt,
            connectedAt: s.connectedAt,
            pingMs: s.pingMs,
        };
    });
    res.json({ sessions: out });
});

export default router;

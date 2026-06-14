import { HTTP_BAD_REQUEST, HTTP_CONFLICT } from "../../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import {
    ClanAuditActions,
    createConsentRequest,
    findPendingConsentsForSiteAccount,
    recordClanAudit,
    RSN_MAX_LEN,
} from "../../../database/index.js";
import { getClanById } from "../../../database/clans/clan-app-helpers.js";
import { getSiteAccountById } from "../../../database/site/site-account-helpers/index.js";
import { broadcastIdentityUpdate } from "../../../data-rights/streams/identity-stream.js";
import {
    findLiveSessionsByRsn,
    requestReidentifyAndAwait,
} from "../../../plugin-api/session/session-registry/index.js";
import { pushClaimConsentRequestLive } from "../../../plugin-api/consent/claim-push.js";
import {
    CLAIM_MESSAGE_AWAITING_CONSENT,
    CLAIM_MESSAGE_BAD_PAYLOAD,
    CLAIM_MESSAGE_NO_CLAN,
    CLAIM_MESSAGE_NO_LIVE_PLUGIN,
    CLAIM_REASON_BAD_PAYLOAD,
    CLAIM_REASON_NO_CLAN,
    CLAIM_REASON_NO_LIVE_PLUGIN,
    CLAIM_REIDENTIFY_TIMEOUT_MS,
} from "../../claim-messages.js";
import { requireSiteAccountId } from "../oauth-helpers.js";

const router = Router();

router.post("/claims", async (req: Request, res: Response) => {
    const siteAccountId = requireSiteAccountId(req, res);
    if (!siteAccountId) return;
    const { rsn } = (req.body ?? {}) as { rsn?: unknown };
    if (typeof rsn !== "string" || rsn.trim().length === 0 || rsn.trim().length > RSN_MAX_LEN) {
        res.status(HTTP_BAD_REQUEST).json({
            ok: false,
            reason: CLAIM_REASON_BAD_PAYLOAD,
            message: CLAIM_MESSAGE_BAD_PAYLOAD,
        });
        return;
    }
    const trimmedRsn = rsn.trim();
    let liveSessions = findLiveSessionsByRsn(trimmedRsn);
    if (liveSessions.length === 0) {
        res.status(HTTP_BAD_REQUEST).json({
            ok: false,
            reason: CLAIM_REASON_NO_LIVE_PLUGIN,
            message: CLAIM_MESSAGE_NO_LIVE_PLUGIN,
        });
        return;
    }
    let session = liveSessions[0]!;
    // first identity from the plugin may have fired before the in-game clan widget loaded
    // (sockClanId stays null even though the player is in a clan). ask the plugin to
    // re-identify and wait briefly for a fresh identity message before giving up.
    if (!session.inGameClanId) {
        await requestReidentifyAndAwait(session.sessionId, CLAIM_REIDENTIFY_TIMEOUT_MS);
        liveSessions = findLiveSessionsByRsn(trimmedRsn);
        if (liveSessions.length === 0) {
            res.status(HTTP_BAD_REQUEST).json({
                ok: false,
                reason: CLAIM_REASON_NO_LIVE_PLUGIN,
                message: CLAIM_MESSAGE_NO_LIVE_PLUGIN,
            });
            return;
        }
        session = liveSessions[0]!;
    }
    const inGameClan = session.inGameClanId ? getClanById(session.inGameClanId) : null;
    if (!inGameClan) {
        res.status(HTTP_BAD_REQUEST).json({
            ok: false,
            reason: CLAIM_REASON_NO_CLAN,
            message: CLAIM_MESSAGE_NO_CLAN,
        });
        return;
    }
    const discoveredClanName = inGameClan.display_name;
    const existing = findPendingConsentsForSiteAccount(siteAccountId, "claim").find(
        (r) =>
            r.target_rsn.toLowerCase() === trimmedRsn.toLowerCase() &&
            (r.declared_clan_name ?? "").toLowerCase() === discoveredClanName.toLowerCase(),
    );
    if (existing) {
        res.status(HTTP_CONFLICT).json({
            ok: false,
            reason: "already_pending",
            requestId: existing.id,
            expiresAt: existing.expires_at,
            clanName: discoveredClanName,
            message: "A pending claim with that rsn + clan already exists. Cancel it before submitting again.",
        });
        return;
    }
    const consent = createConsentRequest({
        kind: "claim",
        requestingSiteAccountId: siteAccountId,
        targetAccountHash: null,
        targetRsn: trimmedRsn,
        declaredClanName: discoveredClanName,
    });
    const requester = getSiteAccountById(siteAccountId);
    const requesterName = requester?.display_name ?? "someone";
    pushClaimConsentRequestLive(
        trimmedRsn,
        consent.id,
        requesterName,
        trimmedRsn,
        discoveredClanName,
        consent.expires_at,
    );
    recordClanAudit(inGameClan.id, {
        actor: siteAccountId,
        action: ClanAuditActions.ClaimConsentRequested,
        targetId: inGameClan.id,
        payload: { declaredRsn: trimmedRsn, declaredClanName: discoveredClanName, declaredClanSlug: inGameClan.slug },
    });
    broadcastIdentityUpdate(siteAccountId, "claim_consent_created");
    res.json({
        ok: true,
        status: "awaiting-plugin-consent",
        requestId: consent.id,
        expiresAt: consent.expires_at,
        liveSessions: liveSessions.length,
        clanName: discoveredClanName,
        message: CLAIM_MESSAGE_AWAITING_CONSENT,
    });
});

export default router;

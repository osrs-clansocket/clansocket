import {
    ClanAuditActions,
    ClanClaimError,
    finalizeClanClaim,
    findConsentRequestById,
    recordClanAudit,
    resolveConsentRequest,
    resolveOrCreateClan,
    type ClanAuditAction,
} from "../../../database/index.js";
import { broadcastIdentityUpdate } from "../../../data-rights/streams/identity-stream.js";
import { insertNotification } from "../../../notifications/helpers.js";
import { EVENT_REIDENTIFY } from "../../event-types.js";
import { logPluginError } from "../../logger/index.js";
import { send } from "../../transport/send.js";
import type { DispatchContext } from "../../handlers/dispatch.js";
import { CLAIM_ELIGIBLE_RANKS_SET, rsnMatchesConsent } from "../eligible-ranks.js";
import { ingestRosterAtClaim, ingestTitlesAtClaim, type ClaimConsentResponseMsg } from "./ingest.js";
import { deriveClaimSlug } from "./slug.js";

const ACCOUNT_HREF = "/account";
const CLAIM_RESOLVED = "claim_consent_resolved";
const KIND_CLAIM_REJECTED = "claim_rejected";

function notifyClaim(accountId: string, kind: string, title: string, body: string): void {
    insertNotification({ siteAccountId: accountId, kind, title, body, href: ACCOUNT_HREF });
}

function auditClaim(clanId: string, actor: string, action: ClanAuditAction, payload: Record<string, unknown>): void {
    recordClanAudit(clanId, { actor, action, targetId: clanId, payload });
}

function rejectClaim(
    consent: { requesting_site_account_id: string; target_rsn: string },
    clanId: string,
    declaredClanName: string,
): void {
    notifyClaim(
        consent.requesting_site_account_id,
        KIND_CLAIM_REJECTED,
        "Clan claim rejected",
        `The holder of '${consent.target_rsn}' rejected the claim on '${declaredClanName}'.`,
    );
    auditClaim(clanId, consent.requesting_site_account_id, ClanAuditActions.ClaimConsentRejected, {
        declaredRsn: consent.target_rsn,
        declaredClanName,
    });
    broadcastIdentityUpdate(consent.requesting_site_account_id, CLAIM_RESOLVED);
}

function reportFinalizeFailure(
    consent: { requesting_site_account_id: string; target_rsn: string },
    clanId: string,
    declaredClanName: string,
    reason: string,
): void {
    auditClaim(clanId, consent.requesting_site_account_id, ClanAuditActions.ClaimRejected, {
        declaredRsn: consent.target_rsn,
        declaredClanName,
        reason,
    });
    notifyClaim(
        consent.requesting_site_account_id,
        KIND_CLAIM_REJECTED,
        "Clan claim failed",
        `Claim on '${declaredClanName}' could not finalize (${reason}).`,
    );
    broadcastIdentityUpdate(consent.requesting_site_account_id, CLAIM_RESOLVED);
}

function confirmClaim(
    consent: { requesting_site_account_id: string; target_rsn: string },
    clanId: string,
    declaredClanName: string,
): void {
    notifyClaim(
        consent.requesting_site_account_id,
        "claim_confirmed",
        "Clan claimed",
        `You now own '${declaredClanName}'.`,
    );
    auditClaim(clanId, consent.requesting_site_account_id, ClanAuditActions.ClaimConsentConfirmed, {
        declaredRsn: consent.target_rsn,
        declaredClanName,
    });
    broadcastIdentityUpdate(consent.requesting_site_account_id, CLAIM_RESOLVED);
}

export function handleClaimConsentResponse(ctx: DispatchContext, msg: ClaimConsentResponseMsg): void {
    const { state, sessionId } = ctx;
    const { requestId, action } = msg;
    const consent = findConsentRequestById(requestId);
    if (!consent || consent.kind !== "claim") {
        logPluginError(sessionId, `claim_consent_response unknown or wrong kind requestId=${requestId}`);
        return;
    }
    if (consent.status !== "pending") {
        logPluginError(sessionId, `claim_consent_response stale requestId=${requestId} status=${consent.status}`);
        return;
    }
    if (!rsnMatchesConsent(state, consent) || !state.sessionAccount || !state.sessionRsn) {
        logPluginError(sessionId, `claim_consent_response rsn mismatch requestId=${requestId}`);
        return;
    }
    const declaredClanName = (consent.declared_clan_name ?? "").trim();
    if (!declaredClanName) {
        logPluginError(sessionId, `claim_consent_response missing clan name requestId=${requestId}`);
        return;
    }
    const clan = resolveOrCreateClan(declaredClanName);
    if (action === "reject") {
        if (!resolveConsentRequest(requestId, "rejected")) return;
        rejectClaim(consent, clan.id, declaredClanName);
        return;
    }
    if (state.sockClanId !== clan.id) {
        logPluginError(sessionId, `claim_consent_response clan mismatch requestId=${requestId}`);
        return;
    }
    const rank = state.latestClanRank ?? "";
    if (!CLAIM_ELIGIBLE_RANKS_SET.has(rank)) {
        logPluginError(sessionId, `claim_consent_response insufficient rank requestId=${requestId} rank=${rank}`);
        return;
    }
    if (!resolveConsentRequest(requestId, "confirmed")) return;
    try {
        const slug = deriveClaimSlug(declaredClanName, clan.id);
        const finalized = finalizeClanClaim({
            displayName: declaredClanName,
            slug,
            siteAccountId: consent.requesting_site_account_id,
            accountHash: state.sessionAccount,
            rsn: state.sessionRsn,
        });
        state.sockClanId = finalized.id;
        state.clanStatus = finalized.status;
        state.clanVerified = true;
    } catch (err) {
        const reason = err instanceof ClanClaimError ? err.code : "internal";
        logPluginError(sessionId, `claim finalize failed: ${(err as Error).message}`);
        reportFinalizeFailure(consent, clan.id, declaredClanName, reason);
        return;
    }
    const proof = msg.clanProof;
    if (proof?.roster && proof.roster.members.length > 0) {
        ingestRosterAtClaim(state, clan.id, state.sessionAccount, proof.roster, sessionId);
    }
    if (proof?.titles && proof.titles.titles.length > 0) {
        ingestTitlesAtClaim(state, clan.id, proof.titles, sessionId);
    }
    confirmClaim(consent, clan.id, declaredClanName);
    send(ctx.ws, { type: EVENT_REIDENTIFY });
}

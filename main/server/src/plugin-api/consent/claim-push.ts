import logger from "@clansocket/logger";
import { findPendingConsentsForRsn, getSiteAccountById } from "../../database/index.js";
import { send } from "../transport/send.js";
import type { PluginSocket } from "../session/socket-state.js";
import { eachClient } from "../transport/wss-registry.js";
import { formatClaimConsentBroadcast } from "./formatters/consent-broadcast-formatter.js";

export function pushPendingClaimConsentsForRsn(ws: PluginSocket, rsn: string): void {
    const claimRows = findPendingConsentsForRsn(rsn, "claim");
    if (claimRows.length === 0) {
        logger.info(`[plugin-api/claim-push] identity replay: no pending claim consents for rsn="${rsn}"`);
        return;
    }
    logger.info(
        `[plugin-api/claim-push] identity replay: pushing ${claimRows.length} pending claim consent(s) for rsn="${rsn}"`,
    );
    for (const row of claimRows) {
        const requester = getSiteAccountById(row.requesting_site_account_id);
        const requesterName = requester?.display_name ?? "someone";
        const requestedClanName = row.declared_clan_name ?? "";
        send(ws, {
            type: "claim_consent_request",
            requestId: row.id,
            requestingDisplayName: requesterName,
            requestedRsn: row.target_rsn,
            requestedClanName,
            expiresAt: row.expires_at,
        });
        send(ws, {
            type: "broadcast",
            message: formatClaimConsentBroadcast(requesterName, row.target_rsn, requestedClanName),
        });
    }
}

function rsnMatches(sessionRsn: string | null | undefined, target: string): boolean {
    if (typeof sessionRsn !== "string" || sessionRsn.length === 0) return false;
    return sessionRsn.toLowerCase() === target.toLowerCase();
}

export function pushClaimConsentRequestLive(
    rsn: string,
    requestId: number,
    requestingDisplayName: string,
    requestedRsn: string,
    requestedClanName: string,
    expiresAt: number,
): boolean {
    let sent = false;
    eachClient((ws) => {
        if (!rsnMatches(ws.pluginState?.sessionRsn, rsn)) return;
        send(ws, {
            type: "claim_consent_request",
            requestId,
            requestingDisplayName,
            requestedRsn,
            requestedClanName,
            expiresAt,
        });
        send(ws, {
            type: "broadcast",
            message: formatClaimConsentBroadcast(requestingDisplayName, requestedRsn, requestedClanName),
        });
        sent = true;
    });
    if (sent) {
        logger.info(
            `[plugin-api/claim-push] live push: claim_consent_request delivered to session rsn~="${rsn}" requestId=${requestId}`,
        );
    } else {
        logger.info(
            `[plugin-api/claim-push] live push: no matching live session for rsn~="${rsn}" requestId=${requestId} — will replay on next identity`,
        );
    }
    return sent;
}

export function pushClaimConsentCancelledLive(rsn: string, requestId: number): void {
    eachClient((ws) => {
        if (!rsnMatches(ws.pluginState?.sessionRsn, rsn)) return;
        send(ws, { type: "claim_consent_cancelled", requestId });
    });
}

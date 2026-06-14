import {
    expirePendingConsents,
    findConsentRequestById,
    findPendingConsentsForAccountHash,
    getSiteAccountById,
    resolveConsentRequest,
} from "../../database/index.js";
import { bindSiteAccountAccountHash } from "../../database/site/site-account-helpers/index.js";
import { upsertVerifiedRsn } from "../../database/index.js";
import { broadcastIdentityUpdate } from "../../data-rights/streams/identity-stream.js";
import { insertNotification } from "../../notifications/helpers.js";
import { logPluginError } from "../logger/index.js";
import { send } from "../transport/send.js";
import type { PluginSocket } from "../session/socket-state.js";
import type { PluginClientMessage } from "../types/index.js";
import { eachClient } from "../transport/wss-registry.js";
import type { DispatchContext } from "../handlers/dispatch.js";
import { formatRsnVerifyBroadcast } from "./formatters/consent-broadcast-formatter.js";

type RsnVerifyResponseMsg = Extract<PluginClientMessage, { type: "rsn_verify_response" }>;

function rsnVerifyRequestMsg(
    requestId: number,
    requestingDisplayName: string,
    requestedRsn: string,
    expiresAt: number,
): {
    type: "rsn_verify_request";
    requestId: number;
    requestingDisplayName: string;
    requestedRsn: string;
    expiresAt: number;
} {
    return { type: "rsn_verify_request", requestId, requestingDisplayName, requestedRsn, expiresAt };
}

function broadcastToAccount(
    accountHash: string,
    build: (ws: PluginSocket) => Parameters<typeof send>[1] | null,
): boolean {
    let sent = false;
    eachClient((ws) => {
        if (ws.pluginState?.sessionAccount !== accountHash) return;
        const msg = build(ws);
        if (msg === null) return;
        send(ws, msg);
        sent = true;
    });
    return sent;
}

export function pushPendingVerifyRequests(ws: PluginSocket, accountHash: string): void {
    expirePendingConsents();
    const pending = findPendingConsentsForAccountHash(accountHash, "rsn");
    for (const req of pending) {
        const requester = getSiteAccountById(req.requesting_site_account_id);
        const requesterName = requester?.display_name ?? "someone";
        send(ws, rsnVerifyRequestMsg(req.id, requesterName, req.target_rsn, req.expires_at));
        send(ws, {
            type: "broadcast",
            message: formatRsnVerifyBroadcast(requesterName, req.target_rsn),
        });
    }
}

export function handleRsnVerifyResponse(ctx: DispatchContext, msg: RsnVerifyResponseMsg): void {
    const { state, sessionId } = ctx;
    const { requestId, action } = msg;
    const req = findConsentRequestById(requestId);
    if (!req) {
        logPluginError(sessionId, `rsn_verify_response unknown requestId=${requestId}`);
        return;
    }
    if (req.kind !== "rsn" || req.target_account_hash === null) {
        logPluginError(sessionId, `rsn_verify_response wrong kind requestId=${requestId} kind=${req.kind}`);
        return;
    }
    if (!state.sessionAccount || req.target_account_hash !== state.sessionAccount) {
        logPluginError(sessionId, `rsn_verify_response wrong account requestId=${requestId}`);
        return;
    }
    if (req.status !== "pending") {
        logPluginError(sessionId, `rsn_verify_response stale requestId=${requestId} status=${req.status}`);
        return;
    }
    const status = action === "confirm" ? "confirmed" : "rejected";
    if (!resolveConsentRequest(requestId, status)) return;
    if (action === "confirm") {
        try {
            bindSiteAccountAccountHash(req.requesting_site_account_id, req.target_account_hash);
            upsertVerifiedRsn(req.target_account_hash, req.target_rsn, "site");
        } catch (err) {
            logPluginError(sessionId, `rsn confirm bind failed: ${(err as Error).message}`);
        }
    }
    insertNotification({
        siteAccountId: req.requesting_site_account_id,
        kind: action === "confirm" ? "rsn_verified" : "rsn_rejected",
        title: action === "confirm" ? "RSN verified" : "RSN claim rejected",
        body:
            action === "confirm"
                ? `'${req.target_rsn}' is now linked to your account.`
                : `The holder of '${req.target_rsn}' rejected your claim.`,
        href: "/account",
    });
    broadcastIdentityUpdate(req.requesting_site_account_id, action === "confirm" ? "confirmed" : "rejected");
}

export function pushRsnVerifyRequestLive(
    accountHash: string,
    requestId: number,
    requestingDisplayName: string,
    requestedRsn: string,
    expiresAt: number,
): boolean {
    let sent = false;
    eachClient((ws) => {
        if (ws.pluginState?.sessionAccount !== accountHash) return;
        send(ws, rsnVerifyRequestMsg(requestId, requestingDisplayName, requestedRsn, expiresAt));
        send(ws, {
            type: "broadcast",
            message: formatRsnVerifyBroadcast(requestingDisplayName, requestedRsn),
        });
        sent = true;
    });
    return sent;
}

export function pushRsnVerifyCancelledLive(accountHash: string, requestId: number): void {
    broadcastToAccount(accountHash, () => ({ type: "rsn_verify_cancelled", requestId }));
}

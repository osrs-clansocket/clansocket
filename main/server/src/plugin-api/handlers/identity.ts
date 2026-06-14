import { findSiteAccountByAccountHash } from "../../database/site/site-account-helpers/index.js";
import { findRsnHolder } from "../../database/site/rsn/state.js";
import { canonicalRsn } from "../../database/site/rsn/canonicalize.js";
import { logPluginError, logPluginIdentity } from "../logger/index.js";
import { modeKey } from "../transport/mode-router.js";
import { send } from "../transport/send.js";
import { isTelemetryAllowedStatus } from "../session/telemetry-gate.js";
import { registerIdentityFailure } from "../session/attack-monitor.js";
import { pushPendingVerifyRequests } from "../consent/rsn-verify.js";
import { pushPendingClaimConsentsForRsn } from "../consent/claim-push.js";
import type { DispatchContext } from "./dispatch.js";
import {
    evaluateClanMembership,
    evaluateManagerBinding,
    flipToAuthed,
    markConnectedAndUpsertRsn,
    recordIdentityToDb,
    resolveClan,
    type IdentityMsg,
} from "./identity-phases.js";

export function handleIdentity(ctx: DispatchContext, msg: IdentityMsg): void {
    const { ws, state, sessionId } = ctx;
    const clanName = (msg.clanName ?? "").trim();
    if (state.sessionAccount !== null && state.sessionAccount !== msg.accountHash) {
        logPluginError(
            sessionId,
            `account_hash drift within session old=${state.sessionAccount} new=${msg.accountHash}`,
        );
        send(ws, { type: "error", reason: "account changed" });
        ws.close(1008, "account changed");
        return;
    }
    state.managerClanId = null;
    state.managerVerified = false;
    state.autoVerifyReason = null;
    const hasClan = clanName.length > 0;
    const knownAccount = findSiteAccountByAccountHash(msg.accountHash) !== null;
    if (!hasClan && !knownAccount) {
        send(ws, { type: "error", reason: "auth_required" });
        ws.close(1008, "auth_required");
        return;
    }
    msg.rsn = canonicalRsn(msg.rsn);
    const priorRsnHolder = findRsnHolder(msg.rsn);
    if (priorRsnHolder && priorRsnHolder.account_hash !== msg.accountHash) {
        registerIdentityFailure(ctx.remote, Date.now());
        logPluginError(
            sessionId,
            `rsn_hash_mismatch rsn=${msg.rsn} incoming=${msg.accountHash} stored=${priorRsnHolder.account_hash}`,
        );
        send(ws, { type: "error", reason: "rsn_hash_mismatch" });
        ws.close(1008, "rsn_hash_mismatch");
        return;
    }
    state.latestClanRank = msg.clanRank ?? null;
    const clanResolution = resolveClan(ctx, clanName);
    if (clanResolution === "error") return;
    const clanRow = clanResolution;
    const mode = modeKey(msg.worldTypes, msg.activity);
    state.sockMode = mode;
    state.sockClanId = clanRow?.id ?? null;
    state.clanStatus = clanRow?.status ?? null;
    state.sessionAccount = msg.accountHash;
    state.sessionRsn = msg.rsn;
    state.currentWorld = msg.world;
    if (clanRow && isTelemetryAllowedStatus(state.clanStatus)) {
        if (!recordIdentityToDb(ctx, msg, clanRow, mode)) return;
    }
    logPluginIdentity(sessionId, {
        rsn: msg.rsn,
        accountHash: msg.accountHash,
        world: msg.world,
        mode,
        activity: msg.activity,
        clanName: msg.clanName ?? null,
        clanRank: msg.clanRank ?? null,
        clanMemberCount: msg.clanMemberCount ?? null,
        clanOnlineCount: msg.clanOnlineCount ?? null,
        worldTypes: msg.worldTypes,
    });
    flipToAuthed(ctx);
    markConnectedAndUpsertRsn(ctx, msg);
    send(ws, { type: "identity_ok" });
    pushPendingVerifyRequests(ws, msg.accountHash);
    pushPendingClaimConsentsForRsn(ws, msg.rsn);
    state.clanVerified = false;
    if (clanRow) evaluateManagerBinding(ctx, clanRow);
    if (!clanRow) return;
    evaluateClanMembership(ctx, msg, clanRow);
}

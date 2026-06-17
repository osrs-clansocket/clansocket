import {
    EVENT_BATCH,
    EVENT_CHAT,
    EVENT_CLAIM_CONSENT_RESPONSE,
    EVENT_CLAN_CONFIG_REQUEST,
    EVENT_CLAN_ROSTER,
    EVENT_CLAN_TITLES_SNAPSHOT,
    EVENT_COMBAT_ACHIEVEMENTS_CATALOG,
    EVENT_HELLO,
    EVENT_IDENTITY,
    EVENT_LOGIN_STATE,
    EVENT_PING,
    EVENT_PONG,
    EVENT_RSN_VERIFY_RESPONSE,
} from "../event-types.js";
import { PLUGIN_PROTOCOL_VERSION } from "../constants.js";
import { logPluginError, logPluginEvent } from "../logger/index.js";
import { send } from "../transport/send.js";
import { isTelemetryAllowedStatus } from "../session/telemetry-gate.js";
import { IN_WORLD_LOGIN_STATES } from "../session/login-states.js";
import { touchPluginCurrentState } from "../../database/index.js";
import type { PluginSocket, PluginSocketState } from "../session/socket-state.js";
import type { PluginClientMessage } from "../types/index.js";
import { handleClaimConsentResponse } from "../consent/claim-finalize/index.js";
import { handleRsnVerifyResponse } from "../consent/rsn-verify.js";
import { handleClanConfigRequest } from "./clan-config.js";
import { handleChat } from "./telemetry/chat.js";
import { handleClanTitlesSnapshot } from "./telemetry/clan-titles.js";
import { handleIdentity } from "./identity.js";
import { handleClanRoster, handleLoginState } from "./state-change.js";
import { STANDARD_TELEMETRY_EVENTS, handleStandardTelemetry } from "./telemetry/standard-telemetry.js";
import { handleCombatAchievementsCatalog } from "./telemetry/snapshots.js";

export interface DispatchContext {
    ws: PluginSocket;
    state: PluginSocketState;
    sessionId: string;
    remote: string;
}

export interface BatchContext {
    batchSeq: number;
    batchTick: number | null;
}

type Handler = (ctx: DispatchContext, msg: PluginClientMessage, batchCtx?: BatchContext) => void;

const handlers = new Map<string, Handler>([
    [EVENT_HELLO, handleHello as Handler],
    [EVENT_PING, handlePing as Handler],
    [EVENT_RSN_VERIFY_RESPONSE, handleRsnVerifyResponse as Handler],
    [EVENT_CLAIM_CONSENT_RESPONSE, handleClaimConsentResponse as Handler],
    [EVENT_IDENTITY, handleIdentity as Handler],
    [EVENT_LOGIN_STATE, handleLoginState as Handler],
    [EVENT_CLAN_ROSTER, handleClanRoster as Handler],
    [EVENT_BATCH, dispatchBatch as Handler],
    [EVENT_CHAT, handleChat as Handler],
    [EVENT_CLAN_TITLES_SNAPSHOT, handleClanTitlesSnapshot as Handler],
    [EVENT_COMBAT_ACHIEVEMENTS_CATALOG, handleCombatAchievementsCatalog as Handler],
    [EVENT_CLAN_CONFIG_REQUEST, handleClanConfigRequest as Handler],
    ...STANDARD_TELEMETRY_EVENTS.map((t) => [t, handleStandardTelemetry as Handler] as const),
]);

export function dispatchPluginMessage(ctx: DispatchContext, msg: PluginClientMessage, batchCtx?: BatchContext): void {
    const handler = handlers.get(msg.type);
    if (!handler) {
        send(ctx.ws, { type: "error", reason: "unknown message type" });
        return;
    }
    handler(ctx, msg, batchCtx);
    bumpCurrentStateSeen(ctx);
}

function bumpCurrentStateSeen(ctx: DispatchContext): void {
    const { state, sessionId } = ctx;
    if (!state.authed || !state.sockClanId || !state.sockMode || !state.sessionAccount) return;
    if (!isTelemetryAllowedStatus(state.clanStatus)) return;
    try {
        touchPluginCurrentState(
            state.sockClanId,
            state.sockMode,
            state.sessionAccount,
            IN_WORLD_LOGIN_STATES.has(state.loginState),
        );
    } catch (err) {
        logPluginError(sessionId, `current_state touch failed: ${(err as Error).message}`);
    }
}

type HelloMsg = Extract<PluginClientMessage, { type: "hello" }>;
type PingMsg = Extract<PluginClientMessage, { type: "ping" }>;
type BatchMsg = Extract<PluginClientMessage, { type: "batch" }>;

function handleHello(ctx: DispatchContext, msg: HelloMsg): void {
    const { ws, sessionId } = ctx;
    if (typeof msg.protocolVersion === "number" && msg.protocolVersion !== PLUGIN_PROTOCOL_VERSION) {
        logPluginError(
            sessionId,
            `protocol_version_mismatch client=${msg.protocolVersion} server=${PLUGIN_PROTOCOL_VERSION}`,
        );
        send(ws, {
            type: "error",
            reason: `protocol_version_mismatch: client=${msg.protocolVersion} server=${PLUGIN_PROTOCOL_VERSION}`,
        });
        ws.close();
        return;
    }
    send(ws, { type: "welcome", sessionId });
}

function handlePing(ctx: DispatchContext, msg: PingMsg): void {
    send(ctx.ws, { type: EVENT_PONG, ts: msg.ts });
}

function dispatchBatch(ctx: DispatchContext, msg: BatchMsg): void {
    const { ws, state, sessionId } = ctx;
    if (state.authed) logPluginEvent(sessionId, EVENT_BATCH, msg);
    if (!Array.isArray(msg.events)) return;
    if (typeof msg.seq === "number" && msg.seq > 0 && msg.seq <= state.lastBatchSeq) return;
    if (typeof msg.seq === "number" && msg.seq > 0) state.lastBatchSeq = msg.seq;
    const batchSeq = typeof msg.seq === "number" ? msg.seq : state.lastBatchSeq;
    const batchTick = typeof (msg as { tick?: unknown }).tick === "number" ? (msg as { tick: number }).tick : null;
    const batchCtx: BatchContext = { batchSeq, batchTick };
    const ordered = [...msg.events].sort((a, b) => {
        const at = (a as { type?: unknown })?.type === EVENT_IDENTITY ? 0 : 1;
        const bt = (b as { type?: unknown })?.type === EVENT_IDENTITY ? 0 : 1;
        return at - bt;
    });
    for (const child of ordered) {
        if (!child || typeof child !== "object") continue;
        if (typeof (child as { type?: unknown }).type !== "string") continue;
        if (!state.bucket.tryConsume()) {
            send(ws, { type: "error", reason: "rate limit" });
            return;
        }
        dispatchPluginMessage(ctx, child as PluginClientMessage, batchCtx);
    }
}

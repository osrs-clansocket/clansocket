import { recordClanRoster, recordPluginLoginState } from "../../database/index.js";
import { EVENT_CLAN_ROSTER, EVENT_LOGIN_STATE } from "../event-types.js";
import {
    LOGIN_STATE_CONNECTION_LOST,
    LOGIN_STATE_HOPPING,
    LOGIN_STATE_LOADING,
    LOGIN_STATE_LOGGED_IN,
    LOGIN_STATE_LOGGED_OUT,
    LOGIN_STATE_LOGGING_IN,
    LOGIN_STATE_LOGIN_SCREEN,
    LOGIN_STATE_LOGIN_SCREEN_AUTHENTICATOR,
    LOGIN_STATE_STARTING,
    LOGIN_STATE_UNKNOWN,
} from "../session/login-states.js";
import { logPluginError, logPluginEvent } from "../logger/index.js";
import { send } from "../transport/send.js";
import type { PluginRosterSnapshotEntry } from "../session/socket-state.js";
import { isTelemetryAllowedStatus, rejectUnauthed } from "../session/telemetry-gate.js";
import type { PluginClientMessage, PluginLoginState } from "../types/index.js";
import type { DispatchContext } from "./dispatch.js";

const VALID_LOGIN_STATES: readonly PluginLoginState[] = [
    LOGIN_STATE_LOGGED_IN,
    LOGIN_STATE_LOGGED_OUT,
    LOGIN_STATE_LOGIN_SCREEN,
    LOGIN_STATE_LOGIN_SCREEN_AUTHENTICATOR,
    LOGIN_STATE_LOGGING_IN,
    LOGIN_STATE_LOADING,
    LOGIN_STATE_HOPPING,
    LOGIN_STATE_CONNECTION_LOST,
    LOGIN_STATE_STARTING,
    LOGIN_STATE_UNKNOWN,
];

type LoginStateMsg = Extract<PluginClientMessage, { type: "login_state" }>;
type ClanRosterMsg = Extract<PluginClientMessage, { type: "clan_roster" }>;

export function handleLoginState(ctx: DispatchContext, msg: LoginStateMsg): void {
    const { ws, state, sessionId } = ctx;
    if (!state.authed || !state.sockMode || !state.sockClanId || !state.sessionAccount) {
        rejectUnauthed(ws, state);
        return;
    }
    if (!VALID_LOGIN_STATES.includes(msg.state)) {
        send(ws, { type: "error", reason: "invalid login_state" });
        return;
    }
    const stateBefore = state.prevLoginState;
    state.prevLoginState = msg.state;
    state.loginState = msg.state;
    if (msg.state === LOGIN_STATE_LOGGED_IN) state.notLoggedInEventCount = 0;
    if (!isTelemetryAllowedStatus(state.clanStatus)) return;
    try {
        recordPluginLoginState(
            state.sockClanId,
            state.sockMode,
            sessionId,
            state.sessionAccount,
            stateBefore,
            msg.state,
        );
    } catch (err) {
        logPluginError(sessionId, `login_state record failed: ${(err as Error).message}`);
    }
    logPluginEvent(sessionId, EVENT_LOGIN_STATE, msg);
}

export function handleClanRoster(ctx: DispatchContext, msg: ClanRosterMsg): void {
    const { ws, state, sessionId } = ctx;
    if (!state.authed || !state.sockClanId || !state.sessionAccount) {
        rejectUnauthed(ws, state);
        return;
    }
    if (!isTelemetryAllowedStatus(state.clanStatus)) return;
    if (state.lastRosterFingerprint === msg.fingerprint) return;
    try {
        recordClanRoster(state.sockClanId, state.sessionAccount, msg.fingerprint, msg.members);
        state.lastRosterFingerprint = msg.fingerprint;
        const snapshot = new Map<string, PluginRosterSnapshotEntry>();
        for (const member of msg.members) {
            snapshot.set(member.name.toLowerCase(), {
                rank: member.rank,
                joinedAt: member.joinedAt,
            });
        }
        state.lastRosterSnapshot = snapshot;
        logPluginEvent(sessionId, EVENT_CLAN_ROSTER, {
            fingerprint: msg.fingerprint,
            member_count: msg.members.length,
        });
    } catch (err) {
        logPluginError(sessionId, `clan_roster record failed: ${(err as Error).message}`);
    }
}

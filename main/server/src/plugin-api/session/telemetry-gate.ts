import { CLAN_STATUS_ACTIVE, CLAN_STATUS_PENDING, CLAN_STATUS_RECOVERY } from "../../shared/clan/clan-status.js";
import { EVENT_REIDENTIFY } from "../event-types.js";
import { IN_WORLD_LOGIN_STATES } from "./login-states.js";
import {
    PLUGIN_IDENTITY_REASSERT_MS,
    PLUGIN_LOGIN_REQUIRED_EVENT_CAP,
    PLUGIN_STALE_IDENTITY_EVENT_CAP,
    PLUGIN_UNAUTHED_EVENT_CAP,
} from "../constants.js";
import { send } from "../transport/send.js";
import type { PluginSocket, PluginSocketState } from "./socket-state.js";

export type TelemetryReason = "unauthed" | "stale_identity" | "not_logged_in" | "clan_blocked";

const TELEMETRY_ALLOWED_STATUSES: ReadonlySet<string> = new Set([
    CLAN_STATUS_ACTIVE,
    CLAN_STATUS_PENDING,
    CLAN_STATUS_RECOVERY,
]);

export function isTelemetryAllowedStatus(status: string | null): boolean {
    return status !== null && TELEMETRY_ALLOWED_STATUSES.has(status);
}

export function checkTelemetryGate(
    state: PluginSocketState,
    now: number,
): { ok: true } | { ok: false; reason: TelemetryReason } {
    if (!state.authed || !state.sockMode || !state.sessionAccount) return { ok: false, reason: "unauthed" };
    if (!isTelemetryAllowedStatus(state.clanStatus) || !state.clanVerified)
        return { ok: false, reason: "clan_blocked" };
    if (now - state.lastIdentityAt > PLUGIN_IDENTITY_REASSERT_MS) return { ok: false, reason: "stale_identity" };
    if (!IN_WORLD_LOGIN_STATES.has(state.loginState)) return { ok: false, reason: "not_logged_in" };
    return { ok: true };
}

export function rejectUnauthed(ws: PluginSocket, state: PluginSocketState): void {
    send(ws, { type: "error", reason: "auth required" });
    state.unauthedEventCount += 1;
    if (state.unauthedEventCount >= PLUGIN_UNAUTHED_EVENT_CAP) {
        ws.close(1008, "unauthed event flood");
    }
}

export function handleTelemetryReject(ws: PluginSocket, state: PluginSocketState, reason: TelemetryReason): void {
    switch (reason) {
        case "unauthed":
            rejectUnauthed(ws, state);
            return;
        case "clan_blocked":
            return;
        case "stale_identity":
            send(ws, { type: EVENT_REIDENTIFY });
            state.staleIdentityEventCount += 1;
            if (state.staleIdentityEventCount >= PLUGIN_STALE_IDENTITY_EVENT_CAP) {
                ws.close(1008, "reidentify ignored");
            }
            return;
        case "not_logged_in":
            send(ws, { type: "error", reason: "not logged in" });
            state.notLoggedInEventCount += 1;
            if (state.notLoggedInEventCount >= PLUGIN_LOGIN_REQUIRED_EVENT_CAP) {
                ws.close(1008, "telemetry while logged out");
            }
            return;
    }
}

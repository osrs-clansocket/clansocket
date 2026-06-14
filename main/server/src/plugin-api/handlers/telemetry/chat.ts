import { recordPluginClanChat } from "../../../database/index.js";
import { EVENT_CHAT } from "../../event-types.js";
import { logPluginError, logPluginEvent } from "../../logger/index.js";
import { send } from "../../transport/send.js";
import { isTelemetryAllowedStatus, rejectUnauthed } from "../../session/telemetry-gate.js";
import type { PluginClientMessage } from "../../types/index.js";
import type { DispatchContext } from "../dispatch.js";

type ChatMsg = Extract<PluginClientMessage, { type: "chat" }>;

const MAX_CHAT_TEXT_LEN = 1024;

export function handleChat(ctx: DispatchContext, msg: ChatMsg): void {
    const { ws, state, sessionId } = ctx;
    if (!state.authed || !state.sockClanId || !state.sessionAccount || !state.sessionRsn) {
        rejectUnauthed(ws, state);
        return;
    }
    if (!isTelemetryAllowedStatus(state.clanStatus)) return;
    if (msg.text.length === 0 || msg.text.length > MAX_CHAT_TEXT_LEN) {
        send(ws, { type: "error", reason: "bad_text" });
        return;
    }
    const timestampMs = msg.eventTs > 0 ? msg.eventTs * 1000 : Date.now();
    try {
        recordPluginClanChat(state.sockClanId, {
            sessionId,
            accountHash: state.sessionAccount,
            rsn: state.sessionRsn,
            senderRsn: msg.senderRsn,
            world: msg.world,
            kind: msg.kind,
            text: msg.text,
            timestampMs,
            eventTs: msg.eventTs,
        });
        logPluginEvent(sessionId, EVENT_CHAT, {
            kind: msg.kind,
            text: msg.text,
            rsn: state.sessionRsn,
            senderRsn: msg.senderRsn,
            world: msg.world,
        });
    } catch (err) {
        logPluginError(sessionId, `chat record failed: ${(err as Error).message}`);
    }
}

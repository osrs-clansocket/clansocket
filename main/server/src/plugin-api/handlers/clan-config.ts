import { effectivePresetForMember } from "../../database/index.js";
import { send } from "../transport/send.js";
import { eachClient } from "../transport/wss-registry.js";
import type { DispatchContext } from "./dispatch.js";

const COLOR_BRAND = "ffcc33";
const COLOR_UPDATE = "5fd47f";
const CATEGORY_UPDATE = "UPDATE";
const UPDATE_BODY_GLOBAL = "Your clan manager published a plugin config update.";
const UPDATE_BODY_MEMBER = "Your clan manager updated your plugin config.";

function wrap(hex: string, body: string): string {
    return `<col=${hex}>${body}</col>`;
}

function formatUpdateBroadcast(body: string): string {
    return `${wrap(COLOR_BRAND, "[ClanSocket ")}${wrap(COLOR_UPDATE, CATEGORY_UPDATE)}${wrap(COLOR_BRAND, "]")} ${body}`;
}

export function handleClanConfigRequest(ctx: DispatchContext): void {
    const { ws, state } = ctx;
    if (!state.authed || !state.sockClanId || !state.sessionAccount) return;
    const preset = effectivePresetForMember(state.sockClanId, state.sessionAccount);
    if (!preset) return;
    send(ws, { type: "clan_config_push", payload: preset });
}

export function broadcastClanConfigForClan(clanId: string): void {
    const message = formatUpdateBroadcast(UPDATE_BODY_GLOBAL);
    eachClient((ws) => {
        const pstate = ws.pluginState;
        if (!pstate || !pstate.authed || pstate.sockClanId !== clanId || !pstate.sessionAccount) return;
        const preset = effectivePresetForMember(clanId, pstate.sessionAccount);
        if (!preset) return;
        send(ws, { type: "clan_config_push", payload: preset });
        send(ws, { type: "broadcast", message });
    });
}

export function broadcastClanConfigForMember(clanId: string, accountHash: string): void {
    const preset = effectivePresetForMember(clanId, accountHash);
    if (!preset) return;
    const message = formatUpdateBroadcast(UPDATE_BODY_MEMBER);
    eachClient((ws) => {
        const pstate = ws.pluginState;
        if (!pstate || !pstate.authed || pstate.sockClanId !== clanId) return;
        if (pstate.sessionAccount !== accountHash) return;
        send(ws, { type: "clan_config_push", payload: preset });
        send(ws, { type: "broadcast", message });
    });
}

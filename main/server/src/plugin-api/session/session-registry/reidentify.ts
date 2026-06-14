import { EVENT_REIDENTIFY } from "../../event-types.js";
import { send } from "../../transport/send.js";
import { eachClient } from "../../transport/wss-registry.js";
import type { PluginSocket } from "../socket-state.js";
import { getSessionStateById } from "./index.js";

function findSocketBySessionId(sessionId: string): PluginSocket | null {
    const state = getSessionStateById(sessionId);
    if (!state) return null;
    let found: PluginSocket | null = null;
    eachClient((ws) => {
        if (ws.pluginState === state) found = ws;
    });
    return found;
}

export function requestReidentifyAndAwait(sessionId: string, timeoutMs: number): Promise<boolean> {
    const sessionState = getSessionStateById(sessionId);
    if (!sessionState) return Promise.resolve(false);
    const sock = findSocketBySessionId(sessionId);
    if (!sock) return Promise.resolve(false);
    send(sock, { type: EVENT_REIDENTIFY });
    return new Promise<boolean>((resolve) => {
        let done = false;
        const signal = AbortSignal.timeout(timeoutMs);
        const onIdentity = (): void => settle(true);
        const onClose = (): void => settle(false);
        const onAbort = (): void => settle(false);
        const settle = (value: boolean): void => {
            if (done) return;
            done = true;
            sessionState.identityWaiters.delete(onIdentity);
            sock.off("close", onClose);
            signal.removeEventListener("abort", onAbort);
            resolve(value);
        };
        sessionState.identityWaiters.add(onIdentity);
        sock.on("close", onClose);
        signal.addEventListener("abort", onAbort);
    });
}

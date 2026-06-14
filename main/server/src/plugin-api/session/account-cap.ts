import { PLUGIN_MAX_SOCKETS_PER_ACCOUNT } from "../constants.js";
import type { PluginSocket } from "./socket-state.js";
import { eachClient } from "../transport/wss-registry.js";

const socketsByAccount = new Map<string, Set<PluginSocket>>();

export function enforceAccountCap(accountHash: string, ws: PluginSocket): void {
    let set = socketsByAccount.get(accountHash);
    if (!set) {
        set = new Set();
        socketsByAccount.set(accountHash, set);
    }
    set.add(ws);
    while (set.size > PLUGIN_MAX_SOCKETS_PER_ACCOUNT) {
        const oldest = set.values().next().value as PluginSocket | undefined;
        if (!oldest || oldest === ws) break;
        set.delete(oldest);
        try {
            oldest.close(1008, "account connection cap");
        } catch {
            oldest.terminate();
        }
    }
}

export function unregisterSocket(accountHash: string, ws: PluginSocket): void {
    const set = socketsByAccount.get(accountHash);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) socketsByAccount.delete(accountHash);
}

export function closePluginSocketsByAccountHash(accountHash: string): number {
    const set = socketsByAccount.get(accountHash);
    if (!set) return 0;
    let n = 0;
    for (const ws of [...set]) {
        try {
            ws.close(1008, "data wiped");
        } catch {
            ws.terminate();
        }
        n += 1;
    }
    return n;
}

export function closePluginSocketsByClanId(clanId: string): number {
    let n = 0;
    eachClient((ws) => {
        if (ws.pluginState?.sockClanId !== clanId) return;
        try {
            ws.close(1008, "clan deleted");
        } catch {
            ws.terminate();
        }
        n += 1;
    });
    return n;
}

export function clearAccountRegistry(): void {
    socketsByAccount.clear();
}

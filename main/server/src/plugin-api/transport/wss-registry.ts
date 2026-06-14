import type { WebSocketServer } from "ws";
import type { PluginSocket } from "../session/socket-state.js";

let wss: WebSocketServer | null = null;

export function setWss(server: WebSocketServer | null): void {
    wss = server;
}

export function getWss(): WebSocketServer | null {
    return wss;
}

export function eachClient(fn: (ws: PluginSocket) => void): void {
    if (!wss) return;
    for (const client of wss.clients) fn(client as PluginSocket);
}

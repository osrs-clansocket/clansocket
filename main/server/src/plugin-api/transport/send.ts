import { PLUGIN_SEND_BUFFER_LIMIT_BYTES } from "../constants.js";
import type { PluginSocket } from "../session/socket-state.js";
import type { PluginServerMessage } from "../types/index.js";

export function send(ws: PluginSocket, msg: PluginServerMessage): void {
    if (ws.readyState !== ws.OPEN) return;
    if (ws.bufferedAmount > PLUGIN_SEND_BUFFER_LIMIT_BYTES) {
        ws.terminate();
        return;
    }
    ws.send(JSON.stringify(msg));
}

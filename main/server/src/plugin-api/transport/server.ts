import logger from "@clansocket/logger";
import type { Server as HttpServer, IncomingMessage } from "http";
import type { Socket } from "net";
import { WebSocketServer } from "ws";
import { PLUGIN_HEARTBEAT_MS, PLUGIN_MAX_PAYLOAD_BYTES, PLUGIN_WS_PATH } from "../constants.js";
import { ipUpgradeLimiter, stopIpUpgradeSweeper } from "../session/ratelimit.js";
import { clientIpFor, isIpFrozen } from "../session/attack-monitor.js";
import { clearAccountRegistry } from "../session/account-cap.js";
import { getWss, setWss } from "./wss-registry.js";
import { onConnection, runHeartbeatTick } from "./connection.js";

let upgradeHandler: ((req: IncomingMessage, socket: Socket, head: Buffer) => void) | null = null;
let attachedServer: HttpServer | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

export function attachPluginApi(server: HttpServer): void {
    if (getWss()) return;

    const wss = new WebSocketServer({ noServer: true, maxPayload: PLUGIN_MAX_PAYLOAD_BYTES });
    setWss(wss);
    attachedServer = server;

    upgradeHandler = (req, socket, head) => {
        const current = getWss();
        if (!current) return;
        const pathname = new URL(req.url ?? "", "http://localhost").pathname;
        if (pathname !== PLUGIN_WS_PATH) return;
        const ip = clientIpFor(req);
        if (isIpFrozen(ip, Date.now())) {
            socket.destroy();
            return;
        }
        if (!ipUpgradeLimiter(ip)) {
            socket.destroy();
            return;
        }
        current.handleUpgrade(req, socket, head, (ws) => {
            current.emit("connection", ws, req);
        });
    };

    server.on("upgrade", upgradeHandler);
    wss.on("connection", onConnection);

    heartbeatInterval = setInterval(runHeartbeatTick, PLUGIN_HEARTBEAT_MS);
    if (typeof heartbeatInterval.unref === "function") heartbeatInterval.unref();

    logger.info(`[plugin-api] attached at ${PLUGIN_WS_PATH}`);
}

export function detachPluginApi(): void {
    const wss = getWss();
    if (!wss) return;
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    stopIpUpgradeSweeper();
    if (attachedServer && upgradeHandler) {
        attachedServer.off("upgrade", upgradeHandler);
    }
    for (const client of wss.clients) client.close(1001, "server shutting down");
    wss.close();
    setWss(null);
    upgradeHandler = null;
    attachedServer = null;
    clearAccountRegistry();
    logger.info("[plugin-api] detached");
}

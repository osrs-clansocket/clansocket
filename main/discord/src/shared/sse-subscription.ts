import http from "node:http";
import https from "node:https";
import logger from "@clansocket/logger";
import config from "../core/config.js";

const BEHIND_PROXY = process.env.BEHIND_PROXY === "1";
const SCHEME = BEHIND_PROXY ? "http" : "https";
const SSE_RECONNECT_MS = 5000;
const SSE_BLOCK_DELIMITER = "\n\n";

export interface SseSubscriptionOptions {
    name: string;
    path: string;
    eventMarker: string;
    onEvent: () => void;
}

class SseSubscription {
    private aborted = false;
    private currentReq: http.ClientRequest | null = null;
    private buffer = "";

    constructor(private readonly opts: SseSubscriptionOptions) {}

    start(): void {
        this.open();
    }

    stop(): void {
        this.aborted = true;
        if (this.currentReq) this.currentReq.destroy();
    }

    private consumeBuffer(chunk: string): void {
        this.buffer += chunk;
        let idx = this.buffer.indexOf(SSE_BLOCK_DELIMITER);
        while (idx !== -1) {
            const block = this.buffer.slice(0, idx);
            this.buffer = this.buffer.slice(idx + SSE_BLOCK_DELIMITER.length);
            if (block.includes(this.opts.eventMarker)) this.opts.onEvent();
            idx = this.buffer.indexOf(SSE_BLOCK_DELIMITER);
        }
    }

    private reconnect(): void {
        setTimeout(() => this.open(), SSE_RECONNECT_MS);
    }

    private wireResponse(res: http.IncomingMessage): void {
        res.setEncoding("utf8");
        const onCloseOrError = (): void => this.reconnect();
        res.on("data", (chunk: string) => this.consumeBuffer(chunk));
        res.on("end", onCloseOrError);
        res.on("error", onCloseOrError);
    }

    private open(): void {
        if (this.aborted) return;
        const token = process.env.API_TOKEN;
        if (!token) throw new Error("API_TOKEN not set");
        const url = new URL(`${SCHEME}://localhost:${config.api.port}${this.opts.path}`);
        const lib = url.protocol === "https:" ? https : http;
        const req = lib.request(url, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            rejectUnauthorized: false,
        });
        this.currentReq = req;
        req.on("response", (res) => this.wireResponse(res));
        req.on("error", (err: Error) => {
            logger.warn(`SSE ${this.opts.name} stream error: ${err.message}`);
            this.reconnect();
        });
        req.end();
    }
}

export function startSseSubscription(opts: SseSubscriptionOptions): () => void {
    const sub = new SseSubscription(opts);
    sub.start();
    return () => sub.stop();
}

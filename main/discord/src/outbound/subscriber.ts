import http from "node:http";
import https from "node:https";
import logger from "@clansocket/logger";
import type { Client } from "discord.js";
import config from "../core/config.js";
import { drainPending } from "./dispatcher.js";

const BEHIND_PROXY = process.env.BEHIND_PROXY === "1";
const SCHEME = BEHIND_PROXY ? "http" : "https";
const SSE_RECONNECT_MS = 5000;
const SSE_BLOCK_DELIMITER = "\n\n";
const OUTBOUND_EVENT_MARKER = "event: outbound";

interface SubscriptionOptions {
    botId: string;
    client: Client;
    url: URL;
    token: string;
    lib: typeof http | typeof https;
}

class OutboundSubscription {
    private aborted = false;
    private currentReq: http.ClientRequest | null = null;
    private buffer = "";

    constructor(private readonly opts: SubscriptionOptions) {}

    start(): void {
        this.open();
    }

    stop(): void {
        this.aborted = true;
        if (this.currentReq) this.currentReq.destroy();
    }

    private triggerDrain(): void {
        drainPending(this.opts.botId, this.opts.client).catch((err: Error) => {
            logger.warn(`Drain failed for ${this.opts.botId}: ${err.message}`);
        });
    }

    private consumeBuffer(chunk: string): void {
        this.buffer += chunk;
        let idx = this.buffer.indexOf(SSE_BLOCK_DELIMITER);
        while (idx !== -1) {
            const block = this.buffer.slice(0, idx);
            this.buffer = this.buffer.slice(idx + SSE_BLOCK_DELIMITER.length);
            if (block.includes(OUTBOUND_EVENT_MARKER)) this.triggerDrain();
            idx = this.buffer.indexOf(SSE_BLOCK_DELIMITER);
        }
    }

    private reconnect(): void {
        setTimeout(() => this.open(), SSE_RECONNECT_MS);
    }

    private open(): void {
        if (this.aborted) return;
        const req = this.opts.lib.request(this.opts.url, {
            method: "GET",
            headers: { Authorization: `Bearer ${this.opts.token}` },
            rejectUnauthorized: false,
        });
        this.currentReq = req;
        req.on("response", (res) => {
            res.setEncoding("utf8");
            const onCloseOrError = (): void => this.reconnect();
            res.on("data", (chunk: string) => this.consumeBuffer(chunk));
            res.on("end", onCloseOrError);
            res.on("error", onCloseOrError);
        });
        req.on("error", (err: Error) => {
            logger.warn(`SSE stream error for ${this.opts.botId}: ${err.message}`);
            this.reconnect();
        });
        req.end();
    }
}

export function startOutboundSubscription(botId: string, client: Client): () => void {
    const token = process.env.API_TOKEN;
    if (!token) throw new Error("API_TOKEN not set");
    const url = new URL(`${SCHEME}://localhost:${config.api.port}/api/discord/outbound/stream/${botId}`);
    const lib = url.protocol === "https:" ? https : http;
    const sub = new OutboundSubscription({ botId, client, url, token, lib });
    sub.start();
    return () => sub.stop();
}

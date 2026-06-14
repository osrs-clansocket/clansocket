import http from "node:http";
import https from "node:https";
import logger from "@clansocket/logger";
import type { Client } from "discord.js";
import config from "../core/config.js";
import { drainPublishQueue } from "./dispatcher.js";

const BEHIND_PROXY = process.env.BEHIND_PROXY === "1";
const SCHEME = BEHIND_PROXY ? "http" : "https";
const SSE_RECONNECT_MS = 5000;
const SSE_BLOCK_DELIMITER = "\n\n";
const PUBLISH_EVENT_MARKER = "event: publish";

interface SubscriptionOptions {
    clanId: string;
    guildId: string;
    client: Client;
    url: URL;
    token: string;
    lib: typeof http | typeof https;
}

class PublishQueueSubscription {
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
        drainPublishQueue(this.opts.clanId, this.opts.guildId, this.opts.client).catch((err: Error) => {
            logger.warn(`Drain failed for ${this.opts.clanId}/${this.opts.guildId}: ${err.message}`);
        });
    }

    private consumeBuffer(chunk: string): void {
        this.buffer += chunk;
        let idx = this.buffer.indexOf(SSE_BLOCK_DELIMITER);
        while (idx !== -1) {
            const block = this.buffer.slice(0, idx);
            this.buffer = this.buffer.slice(idx + SSE_BLOCK_DELIMITER.length);
            if (block.includes(PUBLISH_EVENT_MARKER)) this.triggerDrain();
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
            logger.warn(`SSE stream error for ${this.opts.clanId}/${this.opts.guildId}: ${err.message}`);
            this.reconnect();
        });
        req.end();
    }
}

export function startPublishQueueSubscription(clanId: string, guildId: string, client: Client): () => void {
    const token = process.env.API_TOKEN;
    if (!token) throw new Error("API_TOKEN not set");
    const url = new URL(
        `${SCHEME}://localhost:${config.api.port}/api/discord/publish-queue/stream/${clanId}/${guildId}`,
    );
    const lib = url.protocol === "https:" ? https : http;
    const sub = new PublishQueueSubscription({ clanId, guildId, client, url, token, lib });
    sub.start();
    return () => sub.stop();
}

import { MIME_JSON } from "../../shared/http/http-mime.js";
import logger from "@clansocket/logger";

type EventEntry = { type: string; payload: Record<string, unknown> };

const queue: EventEntry[] = [];
const DRAIN_INTERVAL_MS = 750;
const MAX_BATCH = 10;
const MAX_QUEUE = 200;
const MAX_BLOCK_CHARS = 1900;

let drainTimer: NodeJS.Timeout | null = null;

function url(): string | null {
    const raw = process.env.DISCORD_EVENTS_WEBHOOK_URL;
    return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function summarizeEvent(entry: EventEntry): string {
    const { type, payload } = entry;
    switch (type) {
        case "status":
            return `[status] ${String(payload.status ?? "")}`;
        case "read":
            return `[read] ${String(payload.id ?? "?")}`;
        case "query": {
            const sql = typeof payload.sql === "string" ? payload.sql.replace(/\s+/g, " ").slice(0, 120) : "";
            const rows = typeof payload.rows === "number" ? `${payload.rows} rows` : "";
            const err = typeof payload.error === "string" && payload.error.length > 0 ? `error: ${payload.error}` : "";
            return `[query ${String(payload.db ?? "?")}] ${sql} → ${err || rows}`;
        }
        case "memory":
            return `[memory] ${String(payload.id ?? "?")} ${payload.ok === true ? "ok" : "fail"}`;
        case "pin":
            return `[pin] ${(payload.ids as string[] | undefined)?.join(", ") ?? "?"}`;
        case "unpin":
            return `[unpin] ${(payload.ids as string[] | undefined)?.join(", ") ?? "?"}`;
        case "chain":
            return `[chain depth ${String(payload.depth ?? "?")}] ${String(payload.message ?? "").slice(0, 120)}`;
        case "continuation":
            return `[continuation] ${String(payload.turn ?? "")}`;
        case "append":
            return `[user appended] ${String(payload.text ?? "").slice(0, 120)}`;
        default:
            return `[${type}]`;
    }
}

async function postBatch(lines: string[]): Promise<void> {
    const target = url();
    if (!target || lines.length === 0) return;
    let block = "```\n" + lines.join("\n");
    if (block.length > MAX_BLOCK_CHARS) block = block.slice(0, MAX_BLOCK_CHARS - 4) + "\n…";
    block += "\n```";
    try {
        await fetch(target, {
            method: "POST",
            headers: { "Content-Type": MIME_JSON },
            body: JSON.stringify({ content: block }),
        });
    } catch (err) {
        logger.error("[discord-events-webhook] post failed:", (err as Error).message);
    }
}

function drain(): void {
    if (queue.length === 0) return;
    const batch = queue.splice(0, MAX_BATCH);
    const lines = batch.map(summarizeEvent);
    void postBatch(lines);
}

function ensureDrainer(): void {
    if (drainTimer) return;
    drainTimer = setInterval(drain, DRAIN_INTERVAL_MS);
    if (typeof drainTimer.unref === "function") drainTimer.unref();
}

export function enqueueDiscordEvent(type: string, payload: Record<string, unknown>): void {
    if (!url()) return;
    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push({ type, payload });
    ensureDrainer();
}

import type Database from "better-sqlite3";
import { createHash } from "crypto";
import type { Payload } from "./helpers.js";

export interface EnvelopeContext {
    sessionId: string;
    accountHash: string;
    batchSeq: number;
    batchTick: number | null;
    eventType: string;
}

export interface EventEnvelopeCols {
    session_id: string;
    session_seq: number;
    event_received_at: number;
    plugin_version: string;
}

export function buildEventEnvelope(
    conn: Database.Database,
    ctx: EnvelopeContext,
    _payload: Payload,
): EventEnvelopeCols {
    const session = conn
        .prepare("SELECT plugin_version FROM plugin_sessions WHERE session_id = ?")
        .get(ctx.sessionId) as { plugin_version: string } | undefined;
    return {
        session_id: ctx.sessionId,
        session_seq: ctx.batchSeq,
        event_received_at: Date.now(),
        plugin_version: session?.plugin_version ?? "unknown",
    };
}

export function rowDedupHash(...parts: (string | number | null | undefined)[]): string {
    return createHash("sha1")
        .update(parts.map((p) => p ?? "").join("|"))
        .digest("hex");
}

import { createHash, randomUUID } from "node:crypto";
import { runClanWomWrite } from "../db-runners.js";

const STATUS_PENDING = "pending";
const INITIAL_ATTEMPTS = 0;
const DEFAULT_REQUEST_METHOD = "GET";

export type WomRequestMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface EnqueueWomRequestInput {
    clanId: string;
    requestKind: string;
    requestPath: string;
    requestMethod?: WomRequestMethod;
    query?: Record<string, string | number>;
    body?: unknown;
    scheduledAtMs?: number;
}

const INSERT_SQL = `INSERT INTO clan_wom_outbound_events (
    queue_id, request_kind, request_path, request_method,
    query_json, body_json, payload_hash, dedup_hash,
    status, attempts, scheduled_at, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

function computePayloadHash(method: string, path: string, queryJson: string | null, bodyJson: string | null): string {
    const material = `${method}|${path}|${queryJson ?? ""}|${bodyJson ?? ""}`;
    return createHash("sha256").update(material).digest("hex");
}

function computeDedupHash(clanId: string, requestKind: string, payloadHash: string): string {
    return createHash("sha256").update(`${clanId}|${requestKind}|${payloadHash}`).digest("hex");
}

export function enqueueWomRequest(input: EnqueueWomRequestInput): string {
    const now = Date.now();
    const queueId = randomUUID();
    const method = input.requestMethod ?? DEFAULT_REQUEST_METHOD;
    const queryJson = input.query ? JSON.stringify(input.query) : null;
    const bodyJson = input.body !== undefined ? JSON.stringify(input.body) : null;
    const payloadHash = computePayloadHash(method, input.requestPath, queryJson, bodyJson);
    const dedupHash = computeDedupHash(input.clanId, input.requestKind, payloadHash);

    runClanWomWrite(
        input.clanId,
        INSERT_SQL,
        queueId,
        input.requestKind,
        input.requestPath,
        method,
        queryJson,
        bodyJson,
        payloadHash,
        dedupHash,
        STATUS_PENDING,
        INITIAL_ATTEMPTS,
        input.scheduledAtMs ?? now,
        now,
        now,
    );
    return queueId;
}

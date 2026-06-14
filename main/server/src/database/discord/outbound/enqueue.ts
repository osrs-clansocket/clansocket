import { createHash, randomUUID } from "node:crypto";
import { runDiscordBotWrite } from "../db-runners.js";

const STATUS_PENDING = "pending";
const INITIAL_ATTEMPTS = 0;

export interface EnqueueOutboundInput {
    botId: string;
    botName?: string | null;
    guildId: string;
    clanId: string;
    clanName?: string | null;
    targetKind: string;
    targetId?: string | null;
    targetName?: string | null;
    payload: object;
    flowIdOrigin?: string | null;
    flowName?: string | null;
    flowVersion?: string | null;
    scheduledAtMs?: number;
}

const INSERT_SQL = `INSERT INTO discord_outbound_events (
    queue_id, bot_id, bot_name, guild_id, clan_id, clan_name, status,
    target_kind, target_id, target_name, payload_json, payload_hash, dedup_hash,
    flow_id_origin, flow_name, flow_version,
    attempts, scheduled_at, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

function nullable<T>(v: T | null | undefined): T | null {
    return v ?? null;
}

function computeDedupHash(input: EnqueueOutboundInput, payloadHash: string): string {
    return createHash("sha256")
        .update(`${input.botId}|${input.guildId}|${input.targetKind}|${input.targetId ?? ""}|${payloadHash}`)
        .digest("hex");
}

function buildRowParams(input: EnqueueOutboundInput, queueId: string, payloadJson: string, now: number): unknown[] {
    const payloadHash = createHash("sha256").update(payloadJson).digest("hex");
    const dedupHash = computeDedupHash(input, payloadHash);
    return [
        queueId,
        input.botId,
        nullable(input.botName),
        input.guildId,
        input.clanId,
        nullable(input.clanName),
        STATUS_PENDING,
        input.targetKind,
        nullable(input.targetId),
        nullable(input.targetName),
        payloadJson,
        payloadHash,
        dedupHash,
        nullable(input.flowIdOrigin),
        nullable(input.flowName),
        nullable(input.flowVersion),
        INITIAL_ATTEMPTS,
        input.scheduledAtMs ?? now,
        now,
        now,
    ];
}

export function enqueueOutboundEvent(input: EnqueueOutboundInput): string {
    const now = Date.now();
    const queueId = randomUUID();
    const payloadJson = JSON.stringify(input.payload);
    runDiscordBotWrite(INSERT_SQL, ...buildRowParams(input, queueId, payloadJson, now));
    return queueId;
}

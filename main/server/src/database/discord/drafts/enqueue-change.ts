import { createHash, randomUUID } from "node:crypto";
import { getDiscordGuildDb } from "../database-discord.js";

const INSERT_SQL = `INSERT INTO discord_draft_changes (
    change_id, guild_id, session_id, sequence_no, op_kind,
    target_kind, target_id_or_temp, before_json, after_json, created_at, dedup_hash
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const NEXT_SEQ_SQL = `SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_seq
    FROM discord_draft_changes WHERE session_id = ?`;

export type DraftOpKind = "create" | "update" | "delete";

export interface EnqueueDraftChangeInput {
    clanId: string;
    guildId: string;
    sessionId: string;
    opKind: DraftOpKind;
    targetKind: string;
    targetIdOrTemp: string;
    beforeJson?: string | null;
    afterJson?: string | null;
}

function computeDedupHash(input: EnqueueDraftChangeInput): string {
    const parts = `${input.sessionId}|${input.opKind}|${input.targetKind}|${input.targetIdOrTemp}|${input.beforeJson ?? ""}|${input.afterJson ?? ""}`;
    return createHash("sha256").update(parts).digest("hex");
}

export function enqueueDraftChange(input: EnqueueDraftChangeInput): string {
    const changeId = randomUUID();
    const db = getDiscordGuildDb(input.clanId, input.guildId);
    const tx = db.transaction(() => {
        const next = db.prepare(NEXT_SEQ_SQL).get(input.sessionId) as { next_seq: number };
        db.prepare(INSERT_SQL).run(
            changeId,
            input.guildId,
            input.sessionId,
            next.next_seq,
            input.opKind,
            input.targetKind,
            input.targetIdOrTemp,
            input.beforeJson ?? null,
            input.afterJson ?? null,
            Date.now(),
            computeDedupHash(input),
        );
    });
    tx();
    return changeId;
}

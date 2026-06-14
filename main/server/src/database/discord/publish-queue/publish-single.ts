import { randomUUID } from "node:crypto";
import { getDiscordGuildDb } from "../database-discord.js";

const COUNT_CHANGES_SQL = `SELECT COUNT(*) AS cnt
    FROM discord_draft_changes WHERE session_id = ?`;
const SELECT_CHANGE_SQL = `SELECT change_id FROM discord_draft_changes WHERE session_id = ?`;
const INSERT_QUEUE_SQL = `INSERT INTO discord_draft_publish_queue (
    queue_id, guild_id, session_id, op_id, status, attempt_no, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

const STATUS_PENDING = "pending";
const INITIAL_ATTEMPT = 0;
const SINGLE_CHANGE = 1;

export interface PublishSingleOpDraftInput {
    clanId: string;
    guildId: string;
    sessionId: string;
}

export class NotSingleOpDraftError extends Error {
    public readonly count: number;
    constructor(count: number) {
        super(`Draft session has ${count} changes; publishSingleOpDraft requires exactly ${SINGLE_CHANGE}`);
        this.name = "NotSingleOpDraftError";
        this.count = count;
    }
}

export function publishSingleOpDraft(input: PublishSingleOpDraftInput): string {
    const db = getDiscordGuildDb(input.clanId, input.guildId);
    const queueId = randomUUID();
    const now = Date.now();
    const tx = db.transaction(() => {
        const count = (db.prepare(COUNT_CHANGES_SQL).get(input.sessionId) as { cnt: number }).cnt;
        if (count !== SINGLE_CHANGE) throw new NotSingleOpDraftError(count);
        const change = db.prepare(SELECT_CHANGE_SQL).get(input.sessionId) as { change_id: string };
        db.prepare(INSERT_QUEUE_SQL).run(
            queueId,
            input.guildId,
            input.sessionId,
            change.change_id,
            STATUS_PENDING,
            INITIAL_ATTEMPT,
            now,
            now,
        );
    });
    tx();
    return queueId;
}

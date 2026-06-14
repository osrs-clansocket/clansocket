import { getDiscordGuildDb } from "../database-discord.js";

const SELECT_PENDING_SQL = `SELECT
        queue.queue_id, queue.guild_id, queue.session_id, queue.op_id,
        queue.status, queue.attempt_no, queue.snowflake_resolved,
        queue.resolved_dependencies_json, queue.last_attempt_at, queue.error_json,
        queue.created_at, queue.updated_at,
        change.op_kind, change.target_kind, change.target_id_or_temp,
        change.before_json, change.after_json
    FROM discord_draft_publish_queue queue
    JOIN discord_draft_changes change ON change.change_id = queue.op_id
    WHERE queue.status = 'pending'
    ORDER BY queue.session_id ASC, change.sequence_no ASC`;

export interface PendingPublishRow {
    queue_id: string;
    guild_id: string;
    session_id: string;
    op_id: string;
    status: string;
    attempt_no: number;
    snowflake_resolved: string | null;
    resolved_dependencies_json: string | null;
    last_attempt_at: number | null;
    error_json: string | null;
    created_at: number;
    updated_at: number;
    op_kind: string;
    target_kind: string;
    target_id_or_temp: string;
    before_json: string | null;
    after_json: string | null;
}

export function listPendingPublishQueue(clanId: string, guildId: string): PendingPublishRow[] {
    const db = getDiscordGuildDb(clanId, guildId);
    return db.prepare(SELECT_PENDING_SQL).all() as PendingPublishRow[];
}

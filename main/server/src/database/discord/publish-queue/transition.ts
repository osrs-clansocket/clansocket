import { getDiscordGuildDb } from "../database-discord.js";
import { resolveDependency } from "./resolve-dependency.js";

const STATUS_PENDING = "pending";
const STATUS_IN_FLIGHT = "in_flight";
const STATUS_APPLIED = "applied";
const STATUS_FAILED = "failed";

const OP_KIND_CREATE = "create";
const TEMP_ID_PREFIX = "temp:";

const CLAIM_SQL = `UPDATE discord_draft_publish_queue
    SET status = ?, attempt_no = attempt_no + 1, last_attempt_at = ?
    WHERE queue_id = ? AND status = ?`;

const APPLY_SQL = `UPDATE discord_draft_publish_queue
    SET status = ?, snowflake_resolved = ?, last_attempt_at = ?
    WHERE queue_id = ?`;

const FAIL_SQL = `UPDATE discord_draft_publish_queue
    SET status = ?, last_attempt_at = ?, error_json = ?
    WHERE queue_id = ?`;

const SELECT_OP_AFTER_APPLY_SQL = `SELECT q.session_id, c.op_kind, c.target_id_or_temp
    FROM discord_draft_publish_queue q
    JOIN discord_draft_changes c ON c.change_id = q.op_id
    WHERE q.queue_id = ?`;

interface OpAfterApplyRow {
    session_id: string;
    op_kind: string;
    target_id_or_temp: string;
}

function cascadeCreateResolution(clanId: string, guildId: string, queueId: string, snowflake: string): void {
    const db = getDiscordGuildDb(clanId, guildId);
    const row = db.prepare(SELECT_OP_AFTER_APPLY_SQL).get(queueId) as OpAfterApplyRow | undefined;
    if (!row) return;
    if (row.op_kind !== OP_KIND_CREATE) return;
    if (!row.target_id_or_temp.startsWith(TEMP_ID_PREFIX)) return;
    resolveDependency({
        clanId,
        guildId,
        sessionId: row.session_id,
        tempId: row.target_id_or_temp,
        snowflake,
    });
}

export function markPublishInFlight(clanId: string, guildId: string, queueId: string): boolean {
    const db = getDiscordGuildDb(clanId, guildId);
    const now = Date.now();
    const result = db.prepare(CLAIM_SQL).run(STATUS_IN_FLIGHT, now, queueId, STATUS_PENDING);
    return result.changes > 0;
}

export function markPublishApplied(
    clanId: string,
    guildId: string,
    queueId: string,
    snowflakeResolved: string | null,
): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(APPLY_SQL).run(STATUS_APPLIED, snowflakeResolved, Date.now(), queueId);
    if (snowflakeResolved) {
        cascadeCreateResolution(clanId, guildId, queueId, snowflakeResolved);
    }
}

export function markPublishFailed(clanId: string, guildId: string, queueId: string, errorJson: string | null): void {
    const db = getDiscordGuildDb(clanId, guildId);
    db.prepare(FAIL_SQL).run(STATUS_FAILED, Date.now(), errorJson, queueId);
}

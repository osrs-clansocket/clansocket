-- discord_draft_publish_queue — in-flight publish state
-- (per D23 — created_at + updated_at + resolved_dependencies_json + hung-op detection)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: state table; one row per op being published
-- (transitions through pending → in_flight → applied/failed).
-- snowflake_resolved: NULL for UPDATE/DELETE ops on existing resources (op already has a snowflake).
-- Set when CREATE op resolves temp_id to a real snowflake mid-apply.
-- resolved_dependencies_json: per D23 — map of {temp_id: snowflake} propagated from sibling
-- CREATE ops in same session. Multi-op drafts with CREATE dependencies need this to resolve
-- dep snowflakes at apply time.
-- DG-1: created_at + updated_at + AFTER UPDATE trigger added per D23
-- (P0 escalated — hung-op detection requires created_at).

CREATE TABLE IF NOT EXISTS discord_draft_publish_queue (
    queue_id TEXT NOT NULL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    op_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempt_no INTEGER NOT NULL DEFAULT 0,
    snowflake_resolved TEXT,
    resolved_dependencies_json TEXT,
    last_attempt_at INTEGER,
    error_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_draft_publish_queue_session
ON discord_draft_publish_queue (session_id, status);

CREATE INDEX IF NOT EXISTS idx_discord_draft_publish_queue_pending
ON discord_draft_publish_queue (status, last_attempt_at)
WHERE status IN ('pending', 'in_flight', 'failed');

-- Hung-op detection: pending or in_flight rows whose created_at is too old (per D23)
CREATE INDEX IF NOT EXISTS idx_discord_draft_publish_queue_hung
ON discord_draft_publish_queue (created_at)
WHERE status IN ('pending', 'in_flight');

CREATE TRIGGER IF NOT EXISTS discord_draft_publish_queue_updated_at
AFTER UPDATE ON discord_draft_publish_queue
BEGIN
    UPDATE discord_draft_publish_queue
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE queue_id = new.queue_id;
END;

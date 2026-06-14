-- discord_outbound_failures — per-attempt failure log (child of discord_outbound_events)
--
-- Lives in: data/discord_bot.db
-- Doctrine: append-only; one row per failed attempt on an outbound event row.
-- queue_id soft-FK to discord_outbound_events.queue_id (parent table; renamed from pending_id post-D17).

CREATE TABLE IF NOT EXISTS discord_outbound_failures (
    queue_id TEXT NOT NULL,
    attempt_no INTEGER NOT NULL,
    failed_at INTEGER NOT NULL,
    error_code INTEGER NOT NULL,
    error_body_hash TEXT,
    PRIMARY KEY (queue_id, attempt_no)
);

CREATE INDEX IF NOT EXISTS idx_discord_outbound_failures_queue
ON discord_outbound_failures (queue_id);

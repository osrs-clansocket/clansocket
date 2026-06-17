-- clan_wom_outbound_failures — per-attempt failure log (child of clan_wom_outbound_events)
--
-- Doctrine: append-only; one row per failed attempt on an outbound event row.
-- queue_id soft-FK to clan_wom_outbound_events.queue_id.

CREATE TABLE IF NOT EXISTS clan_wom_outbound_failures (
    queue_id TEXT NOT NULL,
    attempt_no INTEGER NOT NULL,
    failed_at INTEGER NOT NULL,
    error_code INTEGER NOT NULL,
    error_body_hash TEXT,
    PRIMARY KEY (queue_id, attempt_no)
);

CREATE INDEX IF NOT EXISTS idx_clan_wom_outbound_failures_queue
ON clan_wom_outbound_failures (queue_id);

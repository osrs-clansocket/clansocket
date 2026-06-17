-- clan_wom_outbound_events — outbound queue for WoM API requests (per-clan, lives in clan.db)
--
-- Pattern: mirrors discord_outbound_events; status discriminator + dedup_hash partial unique index.
-- Status transitions: pending -> in_flight -> applied / failed / abandoned.
-- Per-attempt failure log lives in clan_wom_outbound_failures (child by queue_id).

CREATE TABLE IF NOT EXISTS clan_wom_outbound_events (
    queue_id TEXT NOT NULL PRIMARY KEY,
    request_kind TEXT NOT NULL,
    request_path TEXT NOT NULL,
    request_method TEXT NOT NULL DEFAULT 'GET',
    query_json TEXT,
    body_json TEXT,
    payload_hash TEXT NOT NULL,
    dedup_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    scheduled_at INTEGER NOT NULL,
    next_attempt_at INTEGER,
    fired_at INTEGER,
    result_code INTEGER,
    response_body_hash TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_clan_wom_outbound_events_active_dedup
ON clan_wom_outbound_events (dedup_hash)
WHERE status IN ('pending', 'in_flight');

CREATE INDEX IF NOT EXISTS idx_clan_wom_outbound_events_ready
ON clan_wom_outbound_events (next_attempt_at, attempts)
WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_clan_wom_outbound_events_history
ON clan_wom_outbound_events (fired_at DESC)
WHERE fired_at IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS clan_wom_outbound_events_updated_at
AFTER UPDATE ON clan_wom_outbound_events
BEGIN
    UPDATE clan_wom_outbound_events
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE queue_id = new.queue_id;
END;

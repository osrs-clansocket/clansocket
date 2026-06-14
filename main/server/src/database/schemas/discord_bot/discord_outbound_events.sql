-- discord_outbound_events — consolidated outbound queue + history (per D23 — dedup_hash partial-index carve-out)
--
-- Lives in: data/discord_bot.db
-- Doctrine: state-with-lifecycle. Consolidates outbound_pending + outbound_history via `status` discriminator.
-- Status transitions: pending → in_flight → applied / failed / abandoned. A single row carries the full lifecycle.
-- Per-attempt failure log lives in discord_outbound_failures (child by queue_id).
--
-- Per D23 dedup_hash fix: partial unique index (not column-level UNIQUE) so finalized rows
-- (applied/failed/abandoned) don't permanently occupy their hash slot — allows re-queue
-- of identical request after finalization.

CREATE TABLE IF NOT EXISTS discord_outbound_events (
    queue_id TEXT NOT NULL PRIMARY KEY,
    bot_id TEXT NOT NULL,
    bot_name TEXT,
    guild_id TEXT NOT NULL,
    clan_id TEXT NOT NULL,
    clan_name TEXT,

    status TEXT NOT NULL DEFAULT 'pending',

    target_kind TEXT NOT NULL,
    target_id TEXT,
    target_name TEXT,
    payload_json TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    dedup_hash TEXT NOT NULL,

    flow_id_origin TEXT,
    flow_name TEXT,
    flow_version TEXT,

    attempts INTEGER NOT NULL DEFAULT 0,
    scheduled_at INTEGER NOT NULL,
    next_attempt_at INTEGER,

    fired_at INTEGER,
    result_code INTEGER,
    response_body_hash TEXT,
    response_message_id TEXT,

    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Partial unique index (D23): dedup uniqueness ONLY for in-flight rows; finalized rows release their hash for re-queue
CREATE UNIQUE INDEX IF NOT EXISTS uniq_discord_outbound_events_active_dedup
ON discord_outbound_events (dedup_hash)
WHERE status IN ('pending', 'in_flight');

CREATE INDEX IF NOT EXISTS idx_discord_outbound_events_ready
ON discord_outbound_events (next_attempt_at, attempts)
WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_discord_outbound_events_tenant
ON discord_outbound_events (clan_id, guild_id, status);

CREATE INDEX IF NOT EXISTS idx_discord_outbound_events_flow
ON discord_outbound_events (flow_id_origin, fired_at DESC)
WHERE flow_id_origin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discord_outbound_events_history
ON discord_outbound_events (guild_id, fired_at DESC)
WHERE fired_at IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS discord_outbound_events_updated_at
AFTER UPDATE ON discord_outbound_events
BEGIN
    UPDATE discord_outbound_events
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE queue_id = new.queue_id;
END;

-- discord_bot_sessions — bot ws connection state
-- (per D23 — classified as STATE table per semantic-audit refute of db-audit's append-history framing)
--
-- Lives in: data/discord_bot.db
-- Doctrine: STATE table; one row per ws session.
-- Mutates as session lifecycle progresses (connected → heartbeats → disconnected).
-- Required for gateway RESUME across bot restarts (sequence_number + resume_gateway_url persisted
-- means reconnect avoids full re-IDENTIFY).
-- shard_id + shard_count required when guild count crosses ~2500.
-- DG-1: updated_at + AFTER UPDATE trigger.

CREATE TABLE IF NOT EXISTS discord_bot_sessions (
    session_id TEXT NOT NULL PRIMARY KEY,
    bot_id TEXT NOT NULL,
    bot_name TEXT,

    ws_session_id TEXT,
    gateway_url TEXT NOT NULL,
    resume_gateway_url TEXT,
    sequence_number INTEGER,

    shard_id INTEGER,
    shard_count INTEGER,

    connected_at INTEGER NOT NULL,
    disconnected_at INTEGER,
    last_heartbeat_at INTEGER,
    ready_payload_hash TEXT,

    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_bot_sessions_active
ON discord_bot_sessions (bot_id)
WHERE disconnected_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discord_bot_sessions_heartbeat
ON discord_bot_sessions (last_heartbeat_at);

CREATE TRIGGER IF NOT EXISTS discord_bot_sessions_updated_at
AFTER UPDATE ON discord_bot_sessions
BEGIN
    UPDATE discord_bot_sessions
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE session_id = new.session_id;
END;

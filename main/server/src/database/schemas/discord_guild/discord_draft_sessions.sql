-- discord_draft_sessions — open draft editing sessions (per D23 + DG-1 fix)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: state table; one row per draft session (open OR closed).
-- CCx-1: guild_id required.
-- conflict_count + last_activity_at drive publish-gate display + abandoned-session cleanup.
-- DG-1: updated_at + AFTER UPDATE trigger.

CREATE TABLE IF NOT EXISTS discord_draft_sessions (
    session_id TEXT NOT NULL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    owner_site_account_id TEXT NOT NULL,
    opened_at INTEGER NOT NULL,
    base_snapshot_id TEXT,
    closed_at INTEGER,
    closed_reason TEXT,
    conflict_count INTEGER NOT NULL DEFAULT 0,
    last_activity_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_draft_sessions_active
ON discord_draft_sessions (owner_site_account_id, guild_id)
WHERE closed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discord_draft_sessions_guild
ON discord_draft_sessions (guild_id, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_discord_draft_sessions_abandoned
ON discord_draft_sessions (last_activity_at)
WHERE closed_at IS NULL;

CREATE TRIGGER IF NOT EXISTS discord_draft_sessions_updated_at
AFTER UPDATE ON discord_draft_sessions
BEGIN
    UPDATE discord_draft_sessions
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE session_id = new.session_id;
END;

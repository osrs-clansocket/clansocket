-- clan_wom_rate_window — per-clan WoM API rate-window state (single row)
--
-- Canonical source of truth for rate-window state per the PAG-WOM-API-RATE-COMPLIANCE doc.
-- One row per clan.db (singleton via CHECK constraint). Dispatcher reads this before firing
-- any outbound request; writes via clan_wom_rate_window accessors after each fire / 429 / success.

CREATE TABLE IF NOT EXISTS clan_wom_rate_window (
    singleton_key TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    window_start INTEGER NOT NULL DEFAULT 0,
    window_count INTEGER NOT NULL DEFAULT 0,
    consecutive_429 INTEGER NOT NULL DEFAULT 0,
    last_request_at INTEGER NOT NULL DEFAULT 0,
    rate_limit INTEGER NOT NULL DEFAULT 20,
    state_name TEXT NOT NULL DEFAULT 'within_limit',
    updated_at INTEGER NOT NULL DEFAULT 0,
    CHECK (singleton_key = 'default')
);

CREATE TRIGGER IF NOT EXISTS clan_wom_rate_window_updated_at
AFTER UPDATE ON clan_wom_rate_window
BEGIN
    UPDATE clan_wom_rate_window
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE singleton_key = new.singleton_key;
END;

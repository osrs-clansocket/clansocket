CREATE TABLE IF NOT EXISTS clan_roster_diffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_fingerprint TEXT,
    to_fingerprint TEXT NOT NULL,
    event_type TEXT NOT NULL,
    member_name TEXT,
    old_value TEXT,
    new_value TEXT,
    detected_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clan_roster_diffs_detected ON clan_roster_diffs (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_clan_roster_diffs_event ON clan_roster_diffs (event_type, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_clan_roster_diffs_member ON clan_roster_diffs (member_name, detected_at DESC);

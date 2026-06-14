CREATE TABLE IF NOT EXISTS clan_rosters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT NOT NULL,
    captured_at INTEGER NOT NULL,
    captured_by_account_hash TEXT NOT NULL,
    captured_by_rsn TEXT,
    member_count INTEGER NOT NULL,
    members_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clan_rosters_captured_at ON clan_rosters (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_clan_rosters_fingerprint ON clan_rosters (fingerprint, captured_at DESC);

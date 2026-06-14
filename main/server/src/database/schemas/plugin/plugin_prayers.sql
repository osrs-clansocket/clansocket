CREATE TABLE IF NOT EXISTS plugin_prayers (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    prayer_id INTEGER NOT NULL,
    prayer_name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, prayer_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_prayers_acct_active ON plugin_prayers (account_hash, active);

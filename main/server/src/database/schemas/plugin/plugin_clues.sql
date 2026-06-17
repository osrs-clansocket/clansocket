CREATE TABLE IF NOT EXISTS plugin_clues (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    tier TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    count_source TEXT,
    count_updated_at INTEGER,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, tier)
);

CREATE INDEX IF NOT EXISTS idx_plugin_clues_account ON plugin_clues (account_hash);

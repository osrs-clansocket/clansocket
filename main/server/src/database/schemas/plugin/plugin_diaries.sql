CREATE TABLE IF NOT EXISTS plugin_diaries (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    diary_id TEXT NOT NULL,
    diary_name TEXT NOT NULL,
    diary_region TEXT NOT NULL,
    tier TEXT NOT NULL,
    complete INTEGER NOT NULL DEFAULT 0 CHECK (complete IN (0, 1)),
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, diary_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_diaries_acct_complete ON plugin_diaries (account_hash, complete);
CREATE INDEX IF NOT EXISTS idx_plugin_diaries_acct_region ON plugin_diaries (account_hash, diary_region);

CREATE TABLE IF NOT EXISTS plugin_stats (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    skill TEXT NOT NULL,
    level INTEGER NOT NULL,
    boosted INTEGER NOT NULL,
    xp INTEGER NOT NULL,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, skill)
);

CREATE INDEX IF NOT EXISTS idx_plugin_stats_account ON plugin_stats (account_hash);

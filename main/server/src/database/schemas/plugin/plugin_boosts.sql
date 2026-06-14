CREATE TABLE IF NOT EXISTS plugin_boosts (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    skill TEXT NOT NULL,
    diff INTEGER NOT NULL,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, skill)
);

CREATE INDEX IF NOT EXISTS idx_plugin_boosts_account ON plugin_boosts (account_hash);

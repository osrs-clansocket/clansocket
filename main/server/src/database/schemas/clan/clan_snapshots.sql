CREATE TABLE IF NOT EXISTS clan_snapshots (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    clan_id TEXT NOT NULL,
    clan_name TEXT NOT NULL,
    member_count INTEGER NOT NULL,
    online_count INTEGER,
    observed_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_clan_snapshots_clan_time ON clan_snapshots (clan_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_clan_snapshots_acct_time ON clan_snapshots (account_hash, observed_at DESC);

CREATE TABLE IF NOT EXISTS clansocket_account_rsns (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('plugin', 'clan_claim', 'site')),
    current_rank TEXT,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    verified_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, rsn)
);

CREATE INDEX IF NOT EXISTS idx_account_rsns_account_seen ON clansocket_account_rsns (account_hash, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_account_rsns_rsn_seen ON clansocket_account_rsns (rsn, last_seen DESC);

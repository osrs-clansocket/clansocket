CREATE TABLE IF NOT EXISTS clansocket_account_bindings (
    site_account_id TEXT NOT NULL,
    account_hash TEXT NOT NULL,
    rsn TEXT,
    bound_at INTEGER NOT NULL,
    last_seen_at INTEGER,
    revoked_at INTEGER,
    PRIMARY KEY (site_account_id, account_hash),
    FOREIGN KEY (site_account_id) REFERENCES clansocket_accounts (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_bindings_active ON clansocket_account_bindings (site_account_id)
WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_account_bindings_by_hash ON clansocket_account_bindings (account_hash)
WHERE revoked_at IS NULL;

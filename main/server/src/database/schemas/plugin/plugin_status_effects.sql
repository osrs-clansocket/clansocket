CREATE TABLE IF NOT EXISTS plugin_status_effects (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    effect TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, effect)
);

CREATE INDEX IF NOT EXISTS idx_plugin_status_effects_acct_active ON plugin_status_effects (account_hash, active);

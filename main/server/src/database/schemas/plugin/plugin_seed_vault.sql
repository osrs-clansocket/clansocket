CREATE TABLE IF NOT EXISTS plugin_seed_vault (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    qty INTEGER NOT NULL,
    unit_price_gp INTEGER,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, item_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_seed_vault_account ON plugin_seed_vault (account_hash);

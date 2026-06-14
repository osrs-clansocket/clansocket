CREATE TABLE IF NOT EXISTS plugin_bank (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    qty INTEGER NOT NULL,
    unit_price_gp INTEGER,
    slot INTEGER,
    bank_tab INTEGER,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, item_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_bank_account ON plugin_bank (account_hash);
CREATE INDEX IF NOT EXISTS idx_plugin_bank_layout ON plugin_bank (account_hash, bank_tab, slot);

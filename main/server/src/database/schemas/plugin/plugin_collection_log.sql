CREATE TABLE IF NOT EXISTS plugin_collection_log (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    qty INTEGER NOT NULL,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, item_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_collection_log_account ON plugin_collection_log (account_hash);
CREATE INDEX IF NOT EXISTS idx_plugin_collection_log_account_category ON plugin_collection_log (account_hash, category);

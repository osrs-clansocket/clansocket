CREATE TABLE IF NOT EXISTS plugin_inventory (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    container_kind TEXT NOT NULL DEFAULT 'MAIN' CHECK (container_kind IN ('MAIN', 'RUNE_POUCH')),
    slot INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    qty INTEGER NOT NULL,
    unit_price_gp INTEGER,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, container_kind, slot)
);

CREATE INDEX IF NOT EXISTS idx_plugin_inventory_account ON plugin_inventory (account_hash);
CREATE INDEX IF NOT EXISTS idx_plugin_inventory_account_kind ON plugin_inventory (account_hash, container_kind);
CREATE INDEX IF NOT EXISTS idx_plugin_inventory_account_item ON plugin_inventory (account_hash, item_id);

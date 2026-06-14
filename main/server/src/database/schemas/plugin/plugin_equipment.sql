CREATE TABLE IF NOT EXISTS plugin_equipment (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    slot TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    qty INTEGER NOT NULL,
    unit_price_gp INTEGER,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, slot)
);

CREATE INDEX IF NOT EXISTS idx_plugin_equipment_account ON plugin_equipment (account_hash);
CREATE INDEX IF NOT EXISTS idx_plugin_equipment_account_item ON plugin_equipment (account_hash, item_id);

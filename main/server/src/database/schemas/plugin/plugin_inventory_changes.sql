CREATE TABLE IF NOT EXISTS plugin_inventory_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    container_kind TEXT NOT NULL CHECK (container_kind IN ('MAIN', 'RUNE_POUCH')),
    qty_signed INTEGER NOT NULL,
    unit_price_gp INTEGER,
    cause_action TEXT,
    cause_option TEXT,
    cause_target TEXT,
    cause_target_id INTEGER,
    world INTEGER NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    plane INTEGER NOT NULL,
    region_id INTEGER NOT NULL,
    region_name TEXT NOT NULL,
    area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_inventory_changes_session ON plugin_inventory_changes (session_id, session_seq);
CREATE INDEX IF NOT EXISTS idx_plugin_inventory_changes_acct_time ON plugin_inventory_changes (
    account_hash, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_inventory_changes_acct_item ON plugin_inventory_changes (
    account_hash, item_id, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_inventory_changes_acct_kind ON plugin_inventory_changes (
    account_hash, container_kind, event_received_at DESC
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plugin_inventory_changes_dedup ON plugin_inventory_changes (dedup_hash);

CREATE TABLE IF NOT EXISTS plugin_loot_drops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    qty INTEGER NOT NULL,
    unit_price_gp INTEGER,
    cause_kind TEXT NOT NULL,
    cause_id INTEGER,
    cause_name TEXT,
    cause_combat_level INTEGER,
    kc INTEGER,
    world INTEGER NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    plane INTEGER NOT NULL,
    region_id INTEGER NOT NULL,
    region_name TEXT NOT NULL,
    area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_loot_drops_session ON plugin_loot_drops (session_id, session_seq);
CREATE INDEX IF NOT EXISTS idx_plugin_loot_drops_acct_time ON plugin_loot_drops (account_hash, event_received_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_loot_drops_acct_item ON plugin_loot_drops (
    account_hash, item_id, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_loot_drops_acct_cause ON plugin_loot_drops (
    account_hash, cause_id, event_received_at DESC
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plugin_loot_drops_dedup ON plugin_loot_drops (dedup_hash);

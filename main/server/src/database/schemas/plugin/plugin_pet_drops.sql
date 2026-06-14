CREATE TABLE IF NOT EXISTS plugin_pet_drops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    pet_item_id INTEGER,
    pet_item_name TEXT,
    "trigger" TEXT NOT NULL,
    message TEXT NOT NULL,
    source_kind TEXT,
    source_id INTEGER,
    source_name TEXT,
    world INTEGER NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    plane INTEGER NOT NULL,
    region_id INTEGER NOT NULL,
    region_name TEXT NOT NULL,
    area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_pet_drops_session ON plugin_pet_drops (session_id, session_seq);
CREATE INDEX IF NOT EXISTS idx_plugin_pet_drops_acct_time ON plugin_pet_drops (account_hash, event_received_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_pet_drops_pet_item_time ON plugin_pet_drops (pet_item_id, event_received_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plugin_pet_drops_dedup ON plugin_pet_drops (dedup_hash);

CREATE TABLE IF NOT EXISTS plugin_farming_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    patch_region_id INTEGER NOT NULL,
    patch_region_name TEXT NOT NULL,
    varbit_id INTEGER NOT NULL,
    crop_id INTEGER,
    crop_name TEXT,
    state_before TEXT NOT NULL,
    state_after TEXT NOT NULL,
    world INTEGER NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    plane INTEGER NOT NULL,
    region_id INTEGER NOT NULL,
    region_name TEXT NOT NULL,
    area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_farming_changes_session ON plugin_farming_changes (session_id, session_seq);
CREATE INDEX IF NOT EXISTS idx_plugin_farming_changes_acct_time ON plugin_farming_changes (
    account_hash, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_farming_changes_acct_patch ON plugin_farming_changes (
    account_hash, patch_region_id, varbit_id, event_received_at DESC
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plugin_farming_changes_dedup ON plugin_farming_changes (dedup_hash);

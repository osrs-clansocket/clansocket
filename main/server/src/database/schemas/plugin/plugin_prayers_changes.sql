CREATE TABLE IF NOT EXISTS plugin_prayers_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    prayer_id INTEGER NOT NULL,
    prayer_name TEXT NOT NULL,
    qty_signed INTEGER NOT NULL,
    world INTEGER NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    plane INTEGER NOT NULL,
    region_id INTEGER NOT NULL,
    region_name TEXT NOT NULL,
    area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_prayers_changes_session ON plugin_prayers_changes (session_id, session_seq);
CREATE INDEX IF NOT EXISTS idx_plugin_prayers_changes_acct_time ON plugin_prayers_changes (
    account_hash, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_prayers_changes_acct_prayer ON plugin_prayers_changes (
    account_hash, prayer_id, event_received_at DESC
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plugin_prayers_changes_dedup ON plugin_prayers_changes (dedup_hash);

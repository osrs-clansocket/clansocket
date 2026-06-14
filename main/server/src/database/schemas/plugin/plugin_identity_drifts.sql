CREATE TABLE IF NOT EXISTS plugin_identity_drifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    old_rsn TEXT NOT NULL,
    new_rsn TEXT NOT NULL,
    world INTEGER,
    x INTEGER,
    y INTEGER,
    plane INTEGER,
    region_id INTEGER,
    region_name TEXT,
    area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_identity_drifts_session ON plugin_identity_drifts (session_id, session_seq);
CREATE INDEX IF NOT EXISTS idx_plugin_identity_drifts_acct_time ON plugin_identity_drifts (
    account_hash, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_identity_drifts_new_rsn ON plugin_identity_drifts (
    new_rsn, event_received_at DESC
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plugin_identity_drifts_dedup ON plugin_identity_drifts (dedup_hash);

CREATE TABLE IF NOT EXISTS plugin_slayer_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    target_name TEXT NOT NULL,
    count_remaining_before INTEGER NOT NULL,
    count_remaining_after INTEGER NOT NULL,
    world INTEGER NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    plane INTEGER NOT NULL,
    region_id INTEGER NOT NULL,
    region_name TEXT NOT NULL,
    area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_slayer_changes_session ON plugin_slayer_changes (session_id, session_seq);
CREATE INDEX IF NOT EXISTS idx_plugin_slayer_changes_acct_time ON plugin_slayer_changes (
    account_hash, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_slayer_changes_acct_task ON plugin_slayer_changes (
    account_hash, target_id, event_received_at DESC
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plugin_slayer_changes_dedup ON plugin_slayer_changes (dedup_hash);

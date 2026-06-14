CREATE TABLE IF NOT EXISTS plugin_login_state_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    state_before TEXT NOT NULL,
    state_after TEXT NOT NULL,
    world INTEGER,
    x INTEGER,
    y INTEGER,
    plane INTEGER,
    region_id INTEGER,
    region_name TEXT,
    area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_login_state_transitions_session ON plugin_login_state_transitions (
    session_id, session_seq
);
CREATE INDEX IF NOT EXISTS idx_plugin_login_state_transitions_acct_time ON plugin_login_state_transitions (
    account_hash, event_received_at DESC
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plugin_login_state_transitions_dedup ON plugin_login_state_transitions (
    dedup_hash
);

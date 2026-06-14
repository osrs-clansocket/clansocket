CREATE TABLE IF NOT EXISTS plugin_world_hops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    from_world INTEGER NOT NULL,
    to_world INTEGER NOT NULL,
    world INTEGER,
    x INTEGER,
    y INTEGER,
    plane INTEGER,
    region_id INTEGER,
    region_name TEXT,
    area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_world_hops_session ON plugin_world_hops (session_id, session_seq);
CREATE INDEX IF NOT EXISTS idx_plugin_world_hops_acct_time ON plugin_world_hops (account_hash, event_received_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_world_hops_from_to ON plugin_world_hops (from_world, to_world);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plugin_world_hops_dedup ON plugin_world_hops (dedup_hash);

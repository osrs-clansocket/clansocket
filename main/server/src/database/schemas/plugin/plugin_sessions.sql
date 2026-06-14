CREATE TABLE IF NOT EXISTS plugin_sessions (
    session_id TEXT PRIMARY KEY,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    world INTEGER,
    world_types TEXT,
    plugin_version TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    connected_at INTEGER NOT NULL,
    disconnected_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_plugin_sessions_account ON plugin_sessions (account_hash);
CREATE INDEX IF NOT EXISTS idx_plugin_sessions_connected_at ON plugin_sessions (connected_at);
CREATE INDEX IF NOT EXISTS idx_plugin_sessions_plugin_version ON plugin_sessions (plugin_version, connected_at);

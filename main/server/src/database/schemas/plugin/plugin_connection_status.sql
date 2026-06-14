CREATE TABLE IF NOT EXISTS plugin_connection_status (
    account_hash TEXT PRIMARY KEY,
    rsn TEXT,
    session_id TEXT,
    ws_connected INTEGER NOT NULL,
    latency_ms INTEGER,
    last_ping_at INTEGER,
    last_pong_at INTEGER,
    connected_at INTEGER,
    disconnected_at INTEGER,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_connection_status_connected ON plugin_connection_status (
    ws_connected, updated_at DESC
);

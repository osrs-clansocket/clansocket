CREATE TABLE IF NOT EXISTS plugin_deaths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    cause_kind TEXT NOT NULL,
    cause_id INTEGER,
    cause_name TEXT,
    cause_combat_level INTEGER,
    cause_category TEXT,
    hp_before INTEGER,
    world INTEGER NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    plane INTEGER NOT NULL,
    region_id INTEGER NOT NULL,
    region_name TEXT NOT NULL,
    area TEXT,
    respawn_x INTEGER,
    respawn_y INTEGER,
    respawn_plane INTEGER,
    respawn_region_id INTEGER,
    respawn_region_name TEXT,
    respawn_area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_deaths_session ON plugin_deaths (session_id, session_seq);
CREATE INDEX IF NOT EXISTS idx_plugin_deaths_acct_time ON plugin_deaths (account_hash, event_received_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_deaths_acct_cause ON plugin_deaths (
    account_hash, cause_id, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_deaths_acct_category ON plugin_deaths (
    account_hash, cause_category, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_deaths_acct_respawn ON plugin_deaths (
    account_hash, respawn_region_id, event_received_at DESC
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plugin_deaths_dedup ON plugin_deaths (dedup_hash);

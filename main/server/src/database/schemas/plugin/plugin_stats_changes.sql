CREATE TABLE IF NOT EXISTS plugin_stats_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    skill TEXT NOT NULL,
    level_before INTEGER NOT NULL,
    level_after INTEGER NOT NULL,
    xp_before INTEGER NOT NULL,
    xp_after INTEGER NOT NULL,
    world INTEGER NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    plane INTEGER NOT NULL,
    region_id INTEGER NOT NULL,
    region_name TEXT NOT NULL,
    area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_stats_changes_session ON plugin_stats_changes (session_id, session_seq);
CREATE INDEX IF NOT EXISTS idx_plugin_stats_changes_acct_time ON plugin_stats_changes (
    account_hash, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_stats_changes_acct_skill ON plugin_stats_changes (
    account_hash, skill, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_stats_changes_levelups ON plugin_stats_changes (
    account_hash, skill, event_received_at DESC
)
WHERE level_after > level_before;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plugin_stats_changes_dedup ON plugin_stats_changes (dedup_hash);

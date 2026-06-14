CREATE TABLE IF NOT EXISTS plugin_combat_achievements_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    task_id INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    boss_id INTEGER,
    boss_name TEXT,
    tier TEXT NOT NULL,
    task_type TEXT,
    points_before INTEGER NOT NULL,
    points_after INTEGER NOT NULL,
    world INTEGER NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    plane INTEGER NOT NULL,
    region_id INTEGER NOT NULL,
    region_name TEXT NOT NULL,
    area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_combat_achievements_changes_session ON plugin_combat_achievements_changes (
    session_id, session_seq
);
CREATE INDEX IF NOT EXISTS idx_plugin_combat_achievements_changes_acct_time ON plugin_combat_achievements_changes (
    account_hash, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_combat_achievements_changes_acct_task ON plugin_combat_achievements_changes (
    account_hash, task_id, event_received_at DESC
);
CREATE INDEX IF NOT EXISTS idx_plugin_combat_achievements_changes_acct_tier ON plugin_combat_achievements_changes (
    account_hash, tier, event_received_at DESC
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plugin_combat_achievements_changes_dedup ON plugin_combat_achievements_changes (
    dedup_hash
);

CREATE TABLE IF NOT EXISTS plugin_slayer (
    account_hash TEXT PRIMARY KEY,
    rsn TEXT NOT NULL,
    target_id INTEGER,
    target_name TEXT,
    area_id INTEGER,
    area_name TEXT,
    master_id INTEGER,
    master_name TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    boss_id INTEGER,
    boss_name TEXT,
    count INTEGER,
    count_original INTEGER,
    wildy_tasks_completed INTEGER NOT NULL DEFAULT 0,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_slayer_target ON plugin_slayer (target_id);

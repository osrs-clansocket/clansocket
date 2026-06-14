CREATE TABLE IF NOT EXISTS plugin_combat_achievements (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    task_id INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    boss_id INTEGER,
    boss_name TEXT,
    tier TEXT NOT NULL,
    task_type TEXT,
    points INTEGER NOT NULL,
    completed_at INTEGER NOT NULL,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, task_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_combat_achievements_acct_tier ON plugin_combat_achievements (account_hash, tier);
CREATE INDEX IF NOT EXISTS idx_plugin_combat_achievements_acct_boss ON plugin_combat_achievements (
    account_hash, boss_id
);

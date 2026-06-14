CREATE TABLE IF NOT EXISTS plugin_combat_achievement_catalog (
    task_id INTEGER PRIMARY KEY,
    task_name TEXT NOT NULL,
    description TEXT,
    tier TEXT NOT NULL,
    task_type TEXT,
    points INTEGER NOT NULL,
    boss_id INTEGER,
    boss_name TEXT,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_combat_achievement_catalog_tier ON plugin_combat_achievement_catalog (tier);
CREATE INDEX IF NOT EXISTS idx_plugin_combat_achievement_catalog_boss ON plugin_combat_achievement_catalog (boss_id);

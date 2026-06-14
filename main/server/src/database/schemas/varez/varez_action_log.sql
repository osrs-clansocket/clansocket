CREATE TABLE IF NOT EXISTS varez_action_log (
    action TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT '',
    cooldown_minutes INTEGER NOT NULL DEFAULT 5,
    executed_at INTEGER NOT NULL,
    PRIMARY KEY (action, target)
);

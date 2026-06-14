CREATE TABLE IF NOT EXISTS varez_user_action_log (
    site_account_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT '',
    cooldown_minutes INTEGER NOT NULL DEFAULT 5,
    executed_at INTEGER NOT NULL,
    PRIMARY KEY (site_account_id, action, target)
);

CREATE INDEX IF NOT EXISTS idx_varez_user_action_log_lookup ON varez_user_action_log (
    site_account_id, action, target, executed_at DESC
);

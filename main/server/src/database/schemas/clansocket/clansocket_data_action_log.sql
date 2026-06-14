CREATE TABLE IF NOT EXISTS clansocket_data_action_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_account_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    target_id TEXT,
    target_name TEXT,
    performed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_data_action_log_account_time ON clansocket_data_action_log (
    site_account_id, performed_at DESC
);
CREATE INDEX IF NOT EXISTS idx_data_action_log_kind_time ON clansocket_data_action_log (kind, performed_at DESC);

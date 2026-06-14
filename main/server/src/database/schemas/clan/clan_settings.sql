CREATE TABLE IF NOT EXISTS clan_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER NOT NULL,
    updated_by_site_account_id TEXT
);

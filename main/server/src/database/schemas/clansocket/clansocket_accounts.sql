CREATE TABLE IF NOT EXISTS clansocket_accounts (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_site_accounts_provider_user ON clansocket_accounts (provider, provider_user_id);

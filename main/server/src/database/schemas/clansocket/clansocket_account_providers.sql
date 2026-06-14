CREATE TABLE IF NOT EXISTS clansocket_account_providers (
    site_account_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    linked_at INTEGER NOT NULL,
    PRIMARY KEY (provider, provider_user_id),
    FOREIGN KEY (site_account_id) REFERENCES clansocket_accounts (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_account_providers_per_account ON clansocket_account_providers (
    site_account_id, provider
);
CREATE INDEX IF NOT EXISTS idx_account_providers_by_account ON clansocket_account_providers (site_account_id);

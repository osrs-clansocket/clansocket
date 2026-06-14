CREATE TABLE IF NOT EXISTS clansocket_oauth_sessions (
    id TEXT PRIMARY KEY,
    site_account_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_used_at INTEGER,
    revoked_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_oauth_sessions_site_account ON clansocket_oauth_sessions (site_account_id);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires ON clansocket_oauth_sessions (expires_at);

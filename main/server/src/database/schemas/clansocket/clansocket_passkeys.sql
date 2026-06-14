CREATE TABLE IF NOT EXISTS clansocket_passkeys (
    id TEXT PRIMARY KEY,
    site_account_id TEXT NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key BLOB NOT NULL,
    sign_count INTEGER NOT NULL DEFAULT 0,
    device_name TEXT,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER,
    FOREIGN KEY (site_account_id) REFERENCES clansocket_accounts (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_passkeys_account ON clansocket_passkeys (site_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_passkeys_credential ON clansocket_passkeys (credential_id);

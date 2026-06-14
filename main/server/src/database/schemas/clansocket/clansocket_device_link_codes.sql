CREATE TABLE IF NOT EXISTS clansocket_device_link_codes (
    code TEXT PRIMARY KEY,
    site_account_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    redeemed_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (site_account_id) REFERENCES clansocket_accounts (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_device_link_codes_expiry ON clansocket_device_link_codes (expires_at);
CREATE INDEX IF NOT EXISTS idx_device_link_codes_account ON clansocket_device_link_codes (
    site_account_id, created_at DESC
);

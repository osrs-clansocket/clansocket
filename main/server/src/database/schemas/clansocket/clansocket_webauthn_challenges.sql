CREATE TABLE IF NOT EXISTS clansocket_webauthn_challenges (
    challenge TEXT PRIMARY KEY,
    purpose TEXT NOT NULL,
    site_account_id TEXT,
    display_name TEXT,
    link_code TEXT,
    backup_code TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expiry ON clansocket_webauthn_challenges (expires_at);

CREATE TABLE IF NOT EXISTS clansocket_backup_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_account_id TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    redeemed_at INTEGER,
    generated_at INTEGER NOT NULL,
    FOREIGN KEY (site_account_id) REFERENCES clansocket_accounts (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_backup_codes_account ON clansocket_backup_codes (
    site_account_id, redeemed_at, generated_at DESC
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_backup_codes_hash ON clansocket_backup_codes (code_hash);

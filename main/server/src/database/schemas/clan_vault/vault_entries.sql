CREATE TABLE IF NOT EXISTS vault_entries (
    entry_key TEXT NOT NULL PRIMARY KEY,
    entry_type TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    iv_b64 TEXT NOT NULL,
    ciphertext_b64 TEXT NOT NULL,
    last_verified_at INTEGER,
    last_verified_status TEXT,
    last_used_at INTEGER,
    set_by TEXT NOT NULL,
    set_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_vault_entries_type ON vault_entries (entry_type);

CREATE TRIGGER IF NOT EXISTS vault_entries_updated_at
AFTER UPDATE ON vault_entries
BEGIN
    UPDATE vault_entries
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE entry_key = new.entry_key;
END;

CREATE TABLE IF NOT EXISTS clansocket_clan_whitelists (
    id TEXT PRIMARY KEY,
    clan_id TEXT NOT NULL,
    clan_name TEXT NOT NULL,
    entry_kind TEXT NOT NULL,
    entry_value TEXT NOT NULL,
    label TEXT,
    added_by_site_account_id TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    revoked_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_clan_whitelists_clan_entry ON clansocket_clan_whitelists (
    clan_id, entry_kind, entry_value
);
CREATE INDEX IF NOT EXISTS idx_clan_whitelists_entry ON clansocket_clan_whitelists (entry_kind, entry_value);
CREATE UNIQUE INDEX IF NOT EXISTS uq_clan_whitelists_active
ON clansocket_clan_whitelists (clan_id, entry_value)
WHERE revoked_at IS NULL;

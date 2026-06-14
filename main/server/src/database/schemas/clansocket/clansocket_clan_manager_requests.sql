CREATE TABLE IF NOT EXISTS clansocket_clan_manager_requests (
    id TEXT PRIMARY KEY,
    site_account_id TEXT NOT NULL,
    declared_account_hash TEXT,
    declared_rsn TEXT NOT NULL,
    clan_id TEXT NOT NULL,
    clan_name TEXT NOT NULL,
    clan_slug TEXT NOT NULL,
    plugin_verified INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_at INTEGER NOT NULL,
    resolved_at INTEGER,
    resolved_by_site_account_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_clan_manager_requests_clan_status ON clansocket_clan_manager_requests (clan_id, status);
CREATE INDEX IF NOT EXISTS idx_clan_manager_requests_account_status ON clansocket_clan_manager_requests (
    site_account_id, status
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_clan_manager_request_pending ON clansocket_clan_manager_requests (
    clan_id, declared_account_hash
)
WHERE status = 'pending';

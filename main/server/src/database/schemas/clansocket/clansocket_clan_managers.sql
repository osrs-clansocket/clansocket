CREATE TABLE IF NOT EXISTS clansocket_clan_managers (
    site_account_id TEXT NOT NULL,
    clan_id TEXT NOT NULL,
    clan_name TEXT NOT NULL,
    role TEXT NOT NULL,
    granted_via TEXT NOT NULL,
    granted_by_site_account_id TEXT,
    granted_at INTEGER NOT NULL,
    revoked_at INTEGER,
    PRIMARY KEY (site_account_id, clan_id)
);

CREATE INDEX IF NOT EXISTS idx_clan_managers_clan_role ON clansocket_clan_managers (clan_id, role);
CREATE INDEX IF NOT EXISTS idx_clan_managers_account ON clansocket_clan_managers (site_account_id);

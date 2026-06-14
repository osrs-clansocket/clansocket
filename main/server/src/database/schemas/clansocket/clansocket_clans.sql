CREATE TABLE IF NOT EXISTS clansocket_clans (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL,
    owner_account_hash TEXT,
    owner_rsn TEXT,
    owner_site_account_id TEXT,
    dir_path TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    claimed_at INTEGER,
    archived_at INTEGER,
    icon_kind TEXT,
    icon_value TEXT,
    color TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_clans_slug ON clansocket_clans (slug);
CREATE INDEX IF NOT EXISTS idx_clans_display_name_lower ON clansocket_clans (LOWER(display_name));
CREATE INDEX IF NOT EXISTS idx_clans_status ON clansocket_clans (status);
CREATE INDEX IF NOT EXISTS idx_clans_owner_account_hash ON clansocket_clans (owner_account_hash);

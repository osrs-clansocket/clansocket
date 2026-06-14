CREATE TABLE IF NOT EXISTS clan_invites (
    code TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    created_by_site_account_id TEXT,
    expires_at INTEGER NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    revoked_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_clan_invites_expires ON clan_invites (expires_at);
CREATE INDEX IF NOT EXISTS idx_clan_invites_creator ON clan_invites (created_by_site_account_id, created_at DESC);

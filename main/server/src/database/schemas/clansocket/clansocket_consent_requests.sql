CREATE TABLE IF NOT EXISTS clansocket_consent_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK (kind IN ('rsn', 'claim', 'manager')),
    requesting_site_account_id TEXT NOT NULL,
    target_account_hash TEXT,
    target_rsn TEXT NOT NULL,
    declared_clan_name TEXT,
    declared_clan_slug TEXT,
    declared_clan_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired', 'cancelled')),
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    resolved_at INTEGER,
    FOREIGN KEY (requesting_site_account_id) REFERENCES clansocket_accounts (id) ON DELETE CASCADE,
    FOREIGN KEY (declared_clan_id) REFERENCES clansocket_clans (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consent_target_hash_pending ON clansocket_consent_requests (
    target_account_hash, kind, status
)
WHERE status = 'pending' AND target_account_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consent_target_rsn_pending ON clansocket_consent_requests (target_rsn, kind, status)
WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_consent_requester ON clansocket_consent_requests (
    requesting_site_account_id, kind, status, created_at DESC
);
CREATE INDEX IF NOT EXISTS idx_consent_expires ON clansocket_consent_requests (expires_at)
WHERE status = 'pending';

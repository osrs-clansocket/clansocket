CREATE TABLE IF NOT EXISTS clansocket_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_account_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    href TEXT,
    dismissed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (site_account_id) REFERENCES clansocket_accounts (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_account ON clansocket_notifications (
    site_account_id, dismissed, created_at DESC
);
CREATE INDEX IF NOT EXISTS idx_notifications_kind_account ON clansocket_notifications (
    site_account_id, kind, created_at DESC
);

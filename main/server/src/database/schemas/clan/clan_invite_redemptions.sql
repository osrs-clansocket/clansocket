CREATE TABLE IF NOT EXISTS clan_invite_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    redeemed_by_site_account_id TEXT NOT NULL,
    redeemed_at INTEGER NOT NULL,
    FOREIGN KEY (code) REFERENCES clan_invites (code) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clan_invite_redemptions_code ON clan_invite_redemptions (code);
CREATE INDEX IF NOT EXISTS idx_clan_invite_redemptions_redeemer ON clan_invite_redemptions (
    redeemed_by_site_account_id
);

CREATE TABLE IF NOT EXISTS clan_members (
    member_name TEXT PRIMARY KEY,
    account_hash TEXT,
    rank TEXT,
    joined_at TEXT,
    first_observed_at INTEGER NOT NULL,
    last_observed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clan_members_last_observed ON clan_members (last_observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_clan_members_joined_at ON clan_members (joined_at);
CREATE INDEX IF NOT EXISTS idx_clan_members_account_hash ON clan_members (account_hash);

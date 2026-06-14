CREATE TABLE IF NOT EXISTS clan_member_history (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    clan_id TEXT NOT NULL,
    clan_name TEXT NOT NULL,
    rank TEXT,
    joined_at TEXT,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    PRIMARY KEY (account_hash, clan_id)
);

CREATE INDEX IF NOT EXISTS idx_clan_member_history_account ON clan_member_history (account_hash);
CREATE INDEX IF NOT EXISTS idx_clan_member_history_clan_time ON clan_member_history (clan_id, last_seen DESC);

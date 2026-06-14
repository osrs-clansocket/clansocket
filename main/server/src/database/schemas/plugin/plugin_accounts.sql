CREATE TABLE IF NOT EXISTS plugin_accounts (
    account_hash TEXT PRIMARY KEY,
    first_rsn TEXT NOT NULL,
    latest_rsn TEXT NOT NULL,
    account_type TEXT,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
);

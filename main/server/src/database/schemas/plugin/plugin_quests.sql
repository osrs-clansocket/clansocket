CREATE TABLE IF NOT EXISTS plugin_quests (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    quest_id INTEGER NOT NULL,
    quest_name TEXT NOT NULL,
    state TEXT NOT NULL,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_quests_acct_state ON plugin_quests (account_hash, state);

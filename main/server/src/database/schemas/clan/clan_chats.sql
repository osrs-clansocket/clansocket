CREATE TABLE IF NOT EXISTS clan_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    sender_rsn TEXT,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    world INTEGER,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clan_chats_session ON clan_chats (session_id, session_seq);
CREATE INDEX IF NOT EXISTS idx_clan_chats_acct_time ON clan_chats (account_hash, event_received_at DESC);
CREATE INDEX IF NOT EXISTS idx_clan_chats_time ON clan_chats (event_received_at DESC);
CREATE INDEX IF NOT EXISTS idx_clan_chats_sender_time ON clan_chats (sender_rsn, event_received_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_clan_chats_dedup ON clan_chats (dedup_hash);

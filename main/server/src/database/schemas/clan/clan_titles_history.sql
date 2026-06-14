CREATE TABLE IF NOT EXISTS clan_titles_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_seq INTEGER NOT NULL,
    event_received_at INTEGER NOT NULL,
    plugin_version TEXT NOT NULL,
    clan_id TEXT NOT NULL,
    clan_name TEXT NOT NULL,
    rank_position INTEGER NOT NULL,
    old_title_id INTEGER,
    old_title_name TEXT,
    new_title_id INTEGER NOT NULL,
    new_title_name TEXT NOT NULL,
    world INTEGER,
    x INTEGER,
    y INTEGER,
    plane INTEGER,
    region_id INTEGER,
    region_name TEXT,
    area TEXT,
    dedup_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clan_titles_history_session ON clan_titles_history (session_id, session_seq);
CREATE INDEX IF NOT EXISTS idx_clan_titles_history_clan_time ON clan_titles_history (clan_id, event_received_at DESC);
CREATE INDEX IF NOT EXISTS idx_clan_titles_history_acct_time ON clan_titles_history (
    account_hash, event_received_at DESC
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_clan_titles_history_dedup ON clan_titles_history (dedup_hash);

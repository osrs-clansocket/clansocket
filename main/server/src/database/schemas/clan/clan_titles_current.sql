CREATE TABLE IF NOT EXISTS clan_titles_current (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    clan_id TEXT NOT NULL,
    clan_name TEXT NOT NULL,
    rank_position INTEGER NOT NULL,
    title_id INTEGER NOT NULL,
    title_name TEXT NOT NULL,
    observed_at INTEGER NOT NULL,
    PRIMARY KEY (clan_id, rank_position)
);

CREATE INDEX IF NOT EXISTS idx_clan_titles_current_clan_rank ON clan_titles_current (clan_id, rank_position);

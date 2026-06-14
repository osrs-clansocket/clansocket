CREATE TABLE IF NOT EXISTS game_ids_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    item_count INTEGER NOT NULL,
    object_count INTEGER NOT NULL,
    npc_count INTEGER NOT NULL,
    cache_id INTEGER,
    cache_timestamp TEXT,
    built_at INTEGER NOT NULL
);

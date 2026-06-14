CREATE TABLE IF NOT EXISTS map_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    tiles_per_region INTEGER NOT NULL,
    pixels_per_tile INTEGER NOT NULL,
    region_px INTEGER NOT NULL,
    origin_world_x INTEGER NOT NULL,
    top_world_y INTEGER NOT NULL,
    region_count INTEGER NOT NULL,
    cache_id INTEGER,
    cache_timestamp TEXT,
    built_at INTEGER NOT NULL
);

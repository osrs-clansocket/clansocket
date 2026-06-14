CREATE TABLE IF NOT EXISTS map_planes (
    plane INTEGER PRIMARY KEY,
    image TEXT NOT NULL,
    tiles_dir TEXT,
    region_count INTEGER NOT NULL
);

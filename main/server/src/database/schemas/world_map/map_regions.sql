CREATE TABLE IF NOT EXISTS map_regions (
    region_id INTEGER PRIMARY KEY,
    rx INTEGER NOT NULL,
    ry INTEGER NOT NULL,
    base_x INTEGER NOT NULL,
    base_y INTEGER NOT NULL,
    px INTEGER NOT NULL,
    py INTEGER NOT NULL,
    pw INTEGER NOT NULL,
    ph INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_map_regions_world ON map_regions (base_x, base_y);
CREATE INDEX IF NOT EXISTS idx_map_regions_coords ON map_regions (rx, ry);
CREATE INDEX IF NOT EXISTS idx_map_regions_px ON map_regions (px, py);

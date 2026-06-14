CREATE TABLE IF NOT EXISTS objects (
    object_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_objects_name ON objects (name);
CREATE INDEX IF NOT EXISTS idx_objects_name_nocase ON objects (name COLLATE NOCASE);

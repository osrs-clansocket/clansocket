CREATE TABLE IF NOT EXISTS npcs (
    npc_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_npcs_name ON npcs (name);
CREATE INDEX IF NOT EXISTS idx_npcs_name_nocase ON npcs (name COLLATE NOCASE);

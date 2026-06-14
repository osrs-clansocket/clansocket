CREATE TABLE IF NOT EXISTS items (
    item_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    stackable INTEGER NOT NULL,
    tradeable INTEGER NOT NULL,
    noted INTEGER NOT NULL,
    linked_note_id INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_name ON items (name);
CREATE INDEX IF NOT EXISTS idx_items_name_nocase ON items (name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_items_linked_note ON items (linked_note_id);

CREATE TABLE IF NOT EXISTS plugin_items_catalog (
    item_id INTEGER PRIMARY KEY,
    item_name TEXT NOT NULL,
    price_gp INTEGER NOT NULL DEFAULT 0,
    last_seen_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_items_catalog_name ON plugin_items_catalog (item_name);
CREATE INDEX IF NOT EXISTS idx_plugin_items_catalog_price ON plugin_items_catalog (price_gp DESC);

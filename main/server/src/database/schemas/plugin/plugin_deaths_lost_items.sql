CREATE TABLE IF NOT EXISTS plugin_deaths_lost_items (
    death_id INTEGER NOT NULL REFERENCES plugin_deaths (id),
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    qty INTEGER NOT NULL,
    unit_price_gp INTEGER,
    PRIMARY KEY (death_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_deaths_lost_items_death ON plugin_deaths_lost_items (death_id);
CREATE INDEX IF NOT EXISTS idx_plugin_deaths_lost_items_item ON plugin_deaths_lost_items (item_id);

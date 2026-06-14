CREATE TABLE IF NOT EXISTS varez_pins (
    site_account_id TEXT NOT NULL,
    pin_id TEXT NOT NULL,
    auto INTEGER NOT NULL DEFAULT 0,
    pinned_at INTEGER NOT NULL,
    PRIMARY KEY (site_account_id, pin_id)
);

CREATE INDEX IF NOT EXISTS idx_varez_pins_pinned_at ON varez_pins (site_account_id, pinned_at ASC);

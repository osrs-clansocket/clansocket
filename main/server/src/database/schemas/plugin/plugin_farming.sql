CREATE TABLE IF NOT EXISTS plugin_farming (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    patch_region_id INTEGER NOT NULL,
    patch_region_name TEXT NOT NULL,
    varbit_id INTEGER NOT NULL,
    crop_id INTEGER,
    crop_name TEXT,
    value INTEGER NOT NULL,
    state TEXT NOT NULL,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, patch_region_id, varbit_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_farming_acct_region ON plugin_farming (account_hash, patch_region_id);
CREATE INDEX IF NOT EXISTS idx_plugin_farming_acct_state ON plugin_farming (account_hash, state);

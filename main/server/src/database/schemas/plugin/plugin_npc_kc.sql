CREATE TABLE IF NOT EXISTS plugin_npc_kc (
    account_hash TEXT NOT NULL,
    rsn TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    source_name TEXT NOT NULL,
    kc INTEGER NOT NULL,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_hash, source_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_npc_kc_account ON plugin_npc_kc (account_hash);
CREATE INDEX IF NOT EXISTS idx_plugin_npc_kc_source ON plugin_npc_kc (source_id);

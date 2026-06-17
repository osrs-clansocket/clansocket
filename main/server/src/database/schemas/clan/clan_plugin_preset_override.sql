CREATE TABLE IF NOT EXISTS clan_plugin_preset_override (
    account_hash TEXT PRIMARY KEY,
    schema_version INTEGER NOT NULL,
    values_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by_site_account_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clan_plugin_preset_override_updated ON clan_plugin_preset_override (updated_at DESC);

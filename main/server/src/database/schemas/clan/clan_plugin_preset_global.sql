CREATE TABLE IF NOT EXISTS clan_plugin_preset_global (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    schema_version INTEGER NOT NULL,
    values_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by_site_account_id TEXT NOT NULL
);

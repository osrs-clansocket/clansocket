-- discord_preset_resources — individual resources within a preset (layer 1)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: append-only per preset_id; ordered by resource_position.
--
-- OQ-2 (preset portability): leaning BOTH approach —
--   resource_snowflake: NULL for portable presets (match by name on apply);
--     SET when preset was snapshotted from a specific guild
--   resource_name: ALWAYS populated; the portable key for cross-guild apply
--   is_portable: flag explicitly toggling fuzzy-name-match on apply vs strict-snowflake-match
-- This schema is FIRST-PASS; final shape depends on OQ-2 resolution.

CREATE TABLE IF NOT EXISTS discord_preset_resources (
    preset_id TEXT NOT NULL,
    preset_name TEXT,
    resource_kind TEXT NOT NULL,
    resource_position INTEGER NOT NULL,
    resource_snowflake TEXT,
    resource_name TEXT NOT NULL,
    resource_json TEXT NOT NULL,
    is_portable INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (preset_id, resource_kind, resource_position)
);

CREATE INDEX IF NOT EXISTS idx_discord_preset_resources_preset
ON discord_preset_resources (preset_id);

CREATE INDEX IF NOT EXISTS idx_discord_preset_resources_kind
ON discord_preset_resources (preset_id, resource_kind);

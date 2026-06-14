-- discord_presets — saved guild layouts, clan-scoped (layer 1)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: state table; one row per preset. A preset is a point-in-time snapshot of a guild's desired structure.
-- Per D2 (1:N clans→guilds), a preset belongs to the clan and can be APPLIED to any of the clan's guilds.

CREATE TABLE IF NOT EXISTS discord_presets (
    preset_id TEXT NOT NULL PRIMARY KEY,
    clan_id TEXT NOT NULL,
    clan_name TEXT,
    name TEXT NOT NULL,
    description TEXT,
    snapshot_json TEXT NOT NULL,
    snapshot_taken_at INTEGER NOT NULL,
    created_by_site_account_id TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_presets_clan
ON discord_presets (clan_id);

CREATE TRIGGER IF NOT EXISTS discord_presets_updated_at
AFTER UPDATE ON discord_presets
BEGIN
    UPDATE discord_presets
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE preset_id = new.preset_id;
END;

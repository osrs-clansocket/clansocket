-- discord_capabilities — per-guild feature toggles (per D23 + DG-1 fix)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: state table; one row per (capability_key, guild_id). CCx-1: guild_id required.
-- Defaults to all bits FALSE on guild registration
-- (manager opts in per capability per DISCORD-PLATFORM.md capability section).
-- DG-1: updated_at + AFTER UPDATE trigger.

CREATE TABLE IF NOT EXISTS discord_capabilities (
    capability_key TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    enabled_bool INTEGER NOT NULL DEFAULT 0,
    toggled_at INTEGER NOT NULL,
    toggled_by_site_account_id TEXT NOT NULL,
    toggled_by_site_account_name TEXT,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (capability_key, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_discord_capabilities_guild
ON discord_capabilities (guild_id);

CREATE INDEX IF NOT EXISTS idx_discord_capabilities_enabled
ON discord_capabilities (guild_id)
WHERE enabled_bool = 1;

CREATE TRIGGER IF NOT EXISTS discord_capabilities_updated_at
AFTER UPDATE ON discord_capabilities
BEGIN
    UPDATE discord_capabilities
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE capability_key = new.capability_key AND guild_id = new.guild_id;
END;

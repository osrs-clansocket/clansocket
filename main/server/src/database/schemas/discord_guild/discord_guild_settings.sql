-- discord_guild_settings — per-guild SINGLETON settings mirror (B6 surface)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: external-state mirror; exempt from W/W/W/W canon.
-- ONE row per guild (PK on guild_id). Bot upserts on ClientReady + on Events.GuildUpdate gateway event.
-- Dashboard reads from this table via SSE projection — NEVER from discord REST.
-- DG-1: updated_at + AFTER UPDATE trigger.
-- welcome_screen_channels_json holds the variable-shape array (channel_id + description + optional emoji).

CREATE TABLE IF NOT EXISTS discord_guild_settings (
    guild_id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    icon_url TEXT,
    banner_url TEXT,
    description TEXT,
    system_channel_id TEXT,
    afk_channel_id TEXT,
    afk_timeout INTEGER,
    verification_level INTEGER NOT NULL DEFAULT 0,
    welcome_screen_enabled INTEGER NOT NULL DEFAULT 0,
    welcome_screen_description TEXT,
    welcome_screen_channels_json TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL
);

CREATE TRIGGER IF NOT EXISTS discord_guild_settings_updated_at
AFTER UPDATE ON discord_guild_settings
BEGIN
    UPDATE discord_guild_settings
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE guild_id = new.guild_id;
END;

-- discord_server_emojis — per-guild server (custom) emoji state mirror (B5a surface)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: external-state mirror; exempt from W/W/W/W canon.
-- DOMAIN SEPARATION LOCKED: server (guild) emojis are distinct from bot application emojis.
-- The global read-only discord_application_emojis (clansocket bot app) lives in data/discord_bot.db, UNTOUCHED by B5a.
-- Bot writes on ClientReady (bulk replace via guild.emojis.cache) and on GuildEmojiCreate/Update/Delete gateway events.
-- Dashboard reads from this table via SSE projection — NEVER from discord REST.
-- DG-1: updated_at + AFTER UPDATE trigger.
-- emoji_id PK with bare `name` per EXEMPT_BASE_TABLE_PAIRS pattern.

CREATE TABLE IF NOT EXISTS discord_server_emojis (
    emoji_id TEXT NOT NULL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role_ids_json TEXT NOT NULL DEFAULT '[]',
    animated INTEGER NOT NULL DEFAULT 0,
    available INTEGER NOT NULL DEFAULT 1,
    managed INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    user_id TEXT,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_server_emojis_guild
ON discord_server_emojis (guild_id);

CREATE TRIGGER IF NOT EXISTS discord_server_emojis_updated_at
AFTER UPDATE ON discord_server_emojis
BEGIN
    UPDATE discord_server_emojis
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE emoji_id = new.emoji_id;
END;

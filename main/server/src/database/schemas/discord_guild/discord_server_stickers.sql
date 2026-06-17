-- discord_server_stickers — per-guild server (custom) sticker state mirror (B5b surface)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: external-state mirror; exempt from W/W/W/W canon.
-- Bot writes on ClientReady (bulk replace via guild.stickers.cache) and on GuildStickerCreate/Update/Delete gateway events.
-- Dashboard reads from this table via SSE projection — NEVER from discord REST.
-- DG-1: updated_at + AFTER UPDATE trigger.
-- sticker_id PK with bare `name` per EXEMPT_BASE_TABLE_PAIRS pattern.

CREATE TABLE IF NOT EXISTS discord_server_stickers (
    sticker_id TEXT NOT NULL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    format_type INTEGER NOT NULL,
    available INTEGER NOT NULL DEFAULT 1,
    image_url TEXT,
    user_id TEXT,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_server_stickers_guild
ON discord_server_stickers (guild_id);

CREATE TRIGGER IF NOT EXISTS discord_server_stickers_updated_at
AFTER UPDATE ON discord_server_stickers
BEGIN
    UPDATE discord_server_stickers
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE sticker_id = new.sticker_id;
END;

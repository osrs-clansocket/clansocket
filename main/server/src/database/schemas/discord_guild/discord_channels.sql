-- discord_channels — per-guild channel state mirror (per D22 2026-06-09 rewrite)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: external-state mirror; exempt from W/W/W/W canon (no actor, no spatial, no event_received_at).
-- Bot writes on ClientReady (bulk replace via guild.channels.cache) and on gateway events (incremental upsert/delete).
-- Dashboard reads from this table via SSE projection — NEVER from discord REST.
-- DG-1: updated_at + AFTER UPDATE trigger.

CREATE TABLE IF NOT EXISTS discord_channels (
    channel_id TEXT NOT NULL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    name TEXT,
    type INTEGER NOT NULL,
    parent_id TEXT,
    position INTEGER,
    topic TEXT,
    nsfw INTEGER NOT NULL DEFAULT 0,
    rate_limit_per_user INTEGER,
    bitrate INTEGER,
    user_limit INTEGER,
    thread_archived INTEGER,
    thread_locked INTEGER,
    thread_auto_archive_duration INTEGER,
    thread_archive_timestamp INTEGER,
    thread_message_count INTEGER,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_channels_guild
ON discord_channels (guild_id);

CREATE INDEX IF NOT EXISTS idx_discord_channels_parent
ON discord_channels (parent_id);

CREATE TRIGGER IF NOT EXISTS discord_channels_updated_at
AFTER UPDATE ON discord_channels
BEGIN
    UPDATE discord_channels
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE channel_id = new.channel_id;
END;

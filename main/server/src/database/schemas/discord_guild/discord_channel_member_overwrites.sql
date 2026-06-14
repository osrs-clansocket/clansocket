-- discord_channel_member_overwrites — per-channel member permission overwrites (B8 surface, member half)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: external-state mirror; exempt from W/W/W/W canon.
-- PER-DOMAIN SPLIT (NOT polymorphic) — paired with discord_channel_role_overwrites.
-- Bot writes on ClientReady (per-channel via channel.permissionOverwrites.cache) and on ChannelUpdate gateway event.
-- Dashboard reads via UNION query over both tables — NEVER from discord REST.
-- DG-1: updated_at + AFTER UPDATE trigger.
-- allow/deny stored as TEXT for full PermissionsBitField precision (bigint serialized).

CREATE TABLE IF NOT EXISTS discord_channel_member_overwrites (
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    allow TEXT NOT NULL,
    deny TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (channel_id, user_id)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_discord_channel_member_overwrites_guild
ON discord_channel_member_overwrites (guild_id);

CREATE INDEX IF NOT EXISTS idx_discord_channel_member_overwrites_channel
ON discord_channel_member_overwrites (channel_id);

CREATE TRIGGER IF NOT EXISTS discord_channel_member_overwrites_updated_at
AFTER UPDATE ON discord_channel_member_overwrites
BEGIN
    UPDATE discord_channel_member_overwrites
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE channel_id = new.channel_id AND user_id = new.user_id;
END;

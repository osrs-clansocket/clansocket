-- discord_channel_role_overwrites — per-channel role permission overwrites (B8 surface, role half)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: external-state mirror; exempt from W/W/W/W canon.
-- PER-DOMAIN SPLIT (NOT polymorphic) — role overwrites + member overwrites live in separate STRICT tables.
-- Bot writes on ClientReady (per-channel via channel.permissionOverwrites.cache) and on ChannelUpdate gateway event.
-- Dashboard reads via UNION query over both tables — NEVER from discord REST.
-- DG-1: updated_at + AFTER UPDATE trigger.
-- allow/deny stored as TEXT for full PermissionsBitField precision (bigint serialized).

CREATE TABLE IF NOT EXISTS discord_channel_role_overwrites (
    channel_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    allow TEXT NOT NULL,
    deny TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (channel_id, role_id)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_discord_channel_role_overwrites_guild
ON discord_channel_role_overwrites (guild_id);

CREATE INDEX IF NOT EXISTS idx_discord_channel_role_overwrites_channel
ON discord_channel_role_overwrites (channel_id);

CREATE TRIGGER IF NOT EXISTS discord_channel_role_overwrites_updated_at
AFTER UPDATE ON discord_channel_role_overwrites
BEGIN
    UPDATE discord_channel_role_overwrites
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE channel_id = new.channel_id AND role_id = new.role_id;
END;

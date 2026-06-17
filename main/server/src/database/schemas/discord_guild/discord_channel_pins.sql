-- discord_channel_pins — per-channel pinned message mirror
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: external-state mirror; exempt from W/W/W/W canon.
-- Bot writes during ready-sync (channel.messages.fetchPinned per text channel) and on
-- ChannelPinsUpdate gateway events. Dashboard reads via REST endpoint, not SSE projection
-- (pins update infrequently; one-shot fetch on channel-inspector-open is sufficient for V1).
-- DG-1: updated_at + AFTER UPDATE trigger.
-- message_id is the PK; pin is in EXEMPT_BASES per audit-schema-doctrine.

CREATE TABLE IF NOT EXISTS discord_channel_pins (
    message_id TEXT NOT NULL PRIMARY KEY,
    channel_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    author_user_id TEXT,
    author_name TEXT,
    content TEXT,
    timestamp INTEGER NOT NULL,
    attachments_json TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_channel_pins_channel
ON discord_channel_pins (channel_id);

CREATE INDEX IF NOT EXISTS idx_discord_channel_pins_guild
ON discord_channel_pins (guild_id);

CREATE TRIGGER IF NOT EXISTS discord_channel_pins_updated_at
AFTER UPDATE ON discord_channel_pins
BEGIN
    UPDATE discord_channel_pins
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE message_id = new.message_id;
END;

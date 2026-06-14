-- discord_webhooks — per-guild webhook state mirror (B4 structural surface)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: external-state mirror; exempt from W/W/W/W canon.
-- Bot writes on ClientReady (per-channel via channel.fetchWebhooks()) and on WebhooksUpdate gateway event.
-- Dashboard reads from this table via SSE projection — NEVER from discord REST.
-- DG-1: updated_at + AFTER UPDATE trigger.
-- webhook_id is in EXEMPT_BASES per audit-schema-doctrine (no webhook_name column required).

CREATE TABLE IF NOT EXISTS discord_webhooks (
    webhook_id TEXT NOT NULL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    application_id TEXT,
    user_id TEXT,
    webhook_type INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_webhooks_guild
ON discord_webhooks (guild_id);

CREATE INDEX IF NOT EXISTS idx_discord_webhooks_channel
ON discord_webhooks (channel_id);

CREATE TRIGGER IF NOT EXISTS discord_webhooks_updated_at
AFTER UPDATE ON discord_webhooks
BEGIN
    UPDATE discord_webhooks
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE webhook_id = new.webhook_id;
END;

-- discord_webhook_tokens — encrypted webhook tokens (per D22; D23 + DG-1)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: clansocket-only persistence. Discord returns webhook tokens to the bot when it has
-- MANAGE_WEBHOOKS permission during channel.fetchWebhooks(). The token is required to POST to
-- the webhook via /api/webhooks/{id}/{token}.
--
-- Acquisition paths (one of acquired_by_bot_id OR bound_by_site_account_id MUST be set):
--   - bot-discovered: the bot persists the token during ready-sync.ts collectWebhooks +
--     Events.WebhooksUpdate; acquired_by_bot_id is set to the discovering bot's id.
--   - user-bound (future): a user explicitly pastes a webhook URL via dashboard; bound_by_*
--     fields set, used by the tier-1 wedge flow. NOT currently implemented.
--
-- Encryption: same scheme as discord_bot_identities (D14) — AES-GCM with per-row IV.
-- DG-1: updated_at + AFTER UPDATE trigger.

CREATE TABLE IF NOT EXISTS discord_webhook_tokens (
    webhook_id TEXT NOT NULL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT,

    encrypted_token_b64 TEXT NOT NULL,
    token_iv_b64 TEXT NOT NULL,
    token_key_id TEXT,

    acquired_by_bot_id TEXT,
    bound_by_site_account_id TEXT,
    bound_by_site_account_name TEXT,
    bound_at INTEGER NOT NULL,
    last_used_at INTEGER,
    revoked_at INTEGER,
    updated_at INTEGER NOT NULL,

    CHECK (acquired_by_bot_id IS NOT NULL OR bound_by_site_account_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_discord_webhook_tokens_guild_active
ON discord_webhook_tokens (guild_id)
WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discord_webhook_tokens_channel
ON discord_webhook_tokens (channel_id)
WHERE revoked_at IS NULL;

CREATE TRIGGER IF NOT EXISTS discord_webhook_tokens_updated_at
AFTER UPDATE ON discord_webhook_tokens
BEGIN
    UPDATE discord_webhook_tokens
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE webhook_id = new.webhook_id;
END;

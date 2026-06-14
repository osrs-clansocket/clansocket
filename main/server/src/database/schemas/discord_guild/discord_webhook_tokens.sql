-- discord_webhook_tokens — encrypted webhook tokens (per D22; D23 + DG-1)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: clansocket-only persistence. Discord returns webhook tokens ONCE on creation; subsequent
-- GET /webhooks/{id} / GET /channels/{id}/webhooks calls do NOT include the token. To send via the
-- webhook later we MUST persist the token. This is the ONLY webhook data we store — webhook resource
-- metadata (name, avatar, channel, kind, created_by) lives in discord, queryable via GET on demand.
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

    bound_at INTEGER NOT NULL,
    bound_by_site_account_id TEXT NOT NULL,
    bound_by_site_account_name TEXT,
    last_used_at INTEGER,
    revoked_at INTEGER,
    updated_at INTEGER NOT NULL
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

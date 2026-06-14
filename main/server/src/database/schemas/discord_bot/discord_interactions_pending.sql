-- discord_interactions_pending — 15-min TTL interaction tokens (per D23 — encryption naming uniformity + updated_at)
--
-- Lives in: data/discord_bot.db
-- Doctrine: state table with TTL; 15-minute lifecycle. CCx-1: N/A (global).
-- Per D23: encryption col naming aligned with discord_bot_identities + discord_webhook_tokens
-- (encrypted_token_b64 + token_iv_b64) for uniformity.
-- acknowledged_at distinguishes "received but not yet responded" from "responded but followups pending".
-- DG-1: updated_at + AFTER UPDATE trigger.

CREATE TABLE IF NOT EXISTS discord_interactions_pending (
    interaction_id TEXT NOT NULL PRIMARY KEY,
    bot_id TEXT NOT NULL,
    bot_name TEXT,
    guild_id TEXT,
    channel_id TEXT NOT NULL,
    channel_name TEXT,
    user_id TEXT NOT NULL,

    kind TEXT NOT NULL,
    encrypted_token_b64 TEXT NOT NULL,
    token_iv_b64 TEXT NOT NULL,
    token_key_id TEXT,

    created_at INTEGER NOT NULL,
    acknowledged_at INTEGER,
    expires_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_interactions_pending_ttl
ON discord_interactions_pending (expires_at)
WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discord_interactions_pending_user
ON discord_interactions_pending (guild_id, user_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS discord_interactions_pending_updated_at
AFTER UPDATE ON discord_interactions_pending
BEGIN
    UPDATE discord_interactions_pending
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE interaction_id = new.interaction_id;
END;

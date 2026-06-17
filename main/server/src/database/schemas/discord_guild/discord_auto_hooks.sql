-- discord_auto_hooks — per-guild trigger-to-webhook auto-post configuration
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: state table; one row per configured auto-hook. When a plugin telemetry event of
-- `trigger_type` arrives for this guild, the dispatcher resolves all enabled rows matching the
-- trigger, renders content + embed per row's template (with {token} substitution), and enqueues a
-- KIND_WEBHOOK_POST outbound event per match. The webhook_id references discord_webhook_tokens
-- in the same db (soft FK; tokens table holds the encrypted token).
-- DG-1: updated_at + AFTER UPDATE trigger.

CREATE TABLE IF NOT EXISTS discord_auto_hooks (
    auto_hook_id TEXT NOT NULL PRIMARY KEY,
    auto_hook_name TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    webhook_id TEXT NOT NULL,

    content_template TEXT,
    use_embed INTEGER NOT NULL DEFAULT 0,
    embed_template_json TEXT,
    conditions_json TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,

    webhook_username_override TEXT,
    webhook_avatar_url_override TEXT,

    created_by_account_id TEXT NOT NULL,
    created_by_account_name TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_auto_hooks_trigger
ON discord_auto_hooks (trigger_type)
WHERE enabled = 1;

CREATE INDEX IF NOT EXISTS idx_discord_auto_hooks_webhook
ON discord_auto_hooks (webhook_id);

CREATE INDEX IF NOT EXISTS idx_discord_auto_hooks_guild
ON discord_auto_hooks (guild_id);

CREATE TRIGGER IF NOT EXISTS discord_auto_hooks_updated_at
AFTER UPDATE ON discord_auto_hooks
BEGIN
    UPDATE discord_auto_hooks
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE auto_hook_id = new.auto_hook_id;
END;

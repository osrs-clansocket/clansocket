-- discord_bot_identities — bot-as-entity (layer 0 foundation, D7 BYO bot support)
--
-- Lives in: data/discord_bot.db
-- Doctrine: state table, one row per bot (clansocket-default + each BYO)
-- BYO tokens encrypted at rest per D14 (open — security review). clansocket-default token in env vault, NULL columns.
-- application_id required for interaction verification + slash command registration (P0 audit finding).

CREATE TABLE IF NOT EXISTS discord_bot_identities (
    bot_id TEXT NOT NULL PRIMARY KEY,
    bot_name TEXT,
    application_id TEXT NOT NULL,
    application_name TEXT NOT NULL,

    owner_kind TEXT NOT NULL,
    owner_site_account_id TEXT,

    clan_id TEXT,
    clan_name TEXT,

    encrypted_token_b64 TEXT,
    token_iv_b64 TEXT,
    token_key_id TEXT,
    token_invalidated_at INTEGER,

    public_key TEXT,
    intents_bitfield INTEGER NOT NULL,
    presence_config_json TEXT,

    created_at INTEGER NOT NULL,
    last_seen_at INTEGER,

    -- active rich presence template (per D19; soft-FK to discord_bot_presence_templates.template_id, same db)
    active_presence_template_id TEXT,
    presence_set_at INTEGER,

    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_bot_identities_byo
ON discord_bot_identities (owner_site_account_id)
WHERE owner_kind = 'byo';

CREATE INDEX IF NOT EXISTS idx_discord_bot_identities_application_id
ON discord_bot_identities (application_id);

CREATE TRIGGER IF NOT EXISTS discord_bot_identities_updated_at
AFTER UPDATE ON discord_bot_identities
BEGIN
    UPDATE discord_bot_identities
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE bot_id = new.bot_id;
END;

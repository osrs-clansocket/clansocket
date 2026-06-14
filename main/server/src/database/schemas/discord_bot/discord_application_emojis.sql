-- discord_application_emojis — per-bot mirror of application-owned emojis fetched from Discord REST.
--
-- Lives in: data/discord_bot.db
-- Doctrine: discord/ pulls the bot's emoji list on ClientReady + POSTs to /api/discord/emojis/sync.
-- Server scans public/resources/osrs/{emojis,anim_emojis,enlarged_emojis} for local mirrors,
-- replaces the row set for the bot, populates public_path when matched.
-- Frontend reads via GET /api/discord/emojis and renders strictly from public_path (never Discord CDN).
-- Server-side shortcode expander (:name: → <:name:id>) reads from this table for outbound composition.

CREATE TABLE IF NOT EXISTS discord_application_emojis (
    bot_id TEXT NOT NULL,
    emoji_id TEXT NOT NULL,
    name TEXT NOT NULL,
    animated INTEGER NOT NULL DEFAULT 0,
    public_path TEXT,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (bot_id, emoji_id)
);

CREATE INDEX IF NOT EXISTS idx_discord_application_emojis_by_name
ON discord_application_emojis (bot_id, name);

CREATE TRIGGER IF NOT EXISTS discord_application_emojis_updated_at
AFTER UPDATE ON discord_application_emojis
BEGIN
    UPDATE discord_application_emojis
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE bot_id = new.bot_id AND emoji_id = new.emoji_id;
END;

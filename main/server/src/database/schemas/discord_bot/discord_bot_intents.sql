-- discord_bot_intents — per-bot intent REQUESTS (per D23 — granted_bool dropped per strict D22)
--
-- Lives in: data/discord_bot.db
-- Doctrine: state table, one row per (bot, intent_bit). Records what clansocket REQUESTED at startup/handshake.
-- granted_bool DROPPED per D23 (Q2 strict D22): when bot is offline the answer is unknowable
-- until next connect; READY payload + GET /applications/@me serve current grants on demand.
-- requires_approval flag tracks whether discord requires admin approval (privileged intents) before grant.
-- DG-1: updated_at + AFTER UPDATE trigger.

CREATE TABLE IF NOT EXISTS discord_bot_intents (
    bot_id TEXT NOT NULL,
    bot_name TEXT,
    intent_bit INTEGER NOT NULL,
    requested_bool INTEGER NOT NULL,
    requires_approval INTEGER NOT NULL DEFAULT 0,
    requested_at INTEGER NOT NULL,
    revoked_at INTEGER,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (bot_id, intent_bit)
);

CREATE INDEX IF NOT EXISTS idx_discord_bot_intents_bot
ON discord_bot_intents (bot_id);

CREATE TRIGGER IF NOT EXISTS discord_bot_intents_updated_at
AFTER UPDATE ON discord_bot_intents
BEGIN
    UPDATE discord_bot_intents
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE bot_id = new.bot_id AND intent_bit = new.intent_bit;
END;

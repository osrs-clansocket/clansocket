-- discord_rate_limit_buckets — per-route + global rate-limit tracking (per D23 — global sentinel row pattern + DG-1)
--
-- Lives in: data/discord_rate_limits.db
-- Doctrine: state table. The bot is the rate-limited entity.
-- scope_key accommodates all three Discord scopes: guild ('g:<guild_id>'),
-- resource ('c:<channel_id>'), route-only ('').
-- bucket_hash captures Discord's shared-bucket hash (P0 audit) — without it limiter produces
-- false comfort on shared buckets.
--
-- Per D23 (Q4): global 50 req/s discord rate limit modeled as SENTINEL ROW with route='__global__',
-- scope_key=''. Application limiter checks the sentinel row BEFORE every request
-- (in addition to the per-route bucket).
-- DG-1: updated_at + AFTER UPDATE trigger.

CREATE TABLE IF NOT EXISTS discord_rate_limit_buckets (
    bot_id TEXT NOT NULL,
    bot_name TEXT,
    route TEXT NOT NULL,
    scope_key TEXT NOT NULL,
    bucket_hash TEXT,

    limit_n INTEGER NOT NULL,
    remaining INTEGER NOT NULL,
    reset_at INTEGER NOT NULL,
    retry_after_ms INTEGER,
    last_429_at INTEGER,

    updated_at INTEGER NOT NULL,

    PRIMARY KEY (bot_id, route, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_discord_rate_limit_buckets_bot
ON discord_rate_limit_buckets (bot_id);

CREATE INDEX IF NOT EXISTS idx_discord_rate_limit_buckets_exhausted
ON discord_rate_limit_buckets (reset_at)
WHERE remaining = 0;

CREATE INDEX IF NOT EXISTS idx_discord_rate_limit_buckets_hash
ON discord_rate_limit_buckets (bucket_hash)
WHERE bucket_hash IS NOT NULL;

-- Fast lookup of the global sentinel row per bot (D23)
CREATE INDEX IF NOT EXISTS idx_discord_rate_limit_buckets_global
ON discord_rate_limit_buckets (bot_id)
WHERE route = '__global__';

CREATE TRIGGER IF NOT EXISTS discord_rate_limit_buckets_updated_at
AFTER UPDATE ON discord_rate_limit_buckets
BEGIN
    UPDATE discord_rate_limit_buckets
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE bot_id = new.bot_id AND route = new.route AND scope_key = new.scope_key;
END;

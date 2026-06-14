-- discord_members — per-guild member state mirror (B3 surface)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: external-state mirror; exempt from W/W/W/W canon.
-- Bot writes on ClientReady (bulk replace via guild.members.fetch) and on gateway events.
-- Dashboard reads from this table via SSE projection — NEVER from discord REST.
-- DG-1: updated_at + AFTER UPDATE trigger.
-- PK on user_id satisfies audit-schema-doctrine EXEMPT_BASE_TABLE_PAIRS via PK + bare name column.

CREATE TABLE IF NOT EXISTS discord_members (
    user_id TEXT NOT NULL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT,
    nickname TEXT,
    joined_at INTEGER,
    premium_since INTEGER,
    communication_disabled_until INTEGER,
    is_boosting INTEGER NOT NULL DEFAULT 0,
    is_bot INTEGER NOT NULL DEFAULT 0,
    role_ids_json TEXT NOT NULL DEFAULT '[]',
    avatar_url TEXT,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_members_guild
ON discord_members (guild_id);

CREATE TRIGGER IF NOT EXISTS discord_members_updated_at
AFTER UPDATE ON discord_members
BEGIN
    UPDATE discord_members
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE user_id = new.user_id;
END;

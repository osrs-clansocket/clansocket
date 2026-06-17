-- discord_roles — per-guild role state mirror (per D22 2026-06-09 rewrite)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: external-state mirror; exempt from W/W/W/W canon (no actor, no spatial, no event_received_at).
-- Bot writes on ClientReady (bulk replace via guild.roles.cache) and on gateway events (incremental upsert/delete).
-- Dashboard reads from this table via SSE projection — NEVER from discord REST.
-- permissions stored as decimal-string bitfield per discord.js convention (BigInt round-trip safe).
-- DG-1: updated_at + AFTER UPDATE trigger.

CREATE TABLE IF NOT EXISTS discord_roles (
    role_id TEXT NOT NULL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color INTEGER NOT NULL DEFAULT 0,
    hoist INTEGER NOT NULL DEFAULT 0,
    mentionable INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL,
    permissions TEXT NOT NULL DEFAULT '0',
    managed INTEGER NOT NULL DEFAULT 0,
    icon_url TEXT,
    unicode_emoji TEXT,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_roles_guild
ON discord_roles (guild_id);

CREATE INDEX IF NOT EXISTS idx_discord_roles_position
ON discord_roles (guild_id, position);

CREATE TRIGGER IF NOT EXISTS discord_roles_updated_at
AFTER UPDATE ON discord_roles
BEGIN
    UPDATE discord_roles
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE role_id = new.role_id;
END;

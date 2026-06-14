-- discord_managed_namespace — what clansocket considers "ours to touch" (per D23 + DG-1 fix)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: state table; one row per discord resource tagged into the managed namespace.
-- CCx-1: guild_id required.
-- Load-bearing per DISCORD-PLATFORM.md: "clansocket only touches what it created OR tagged
-- managed, never the rest of the guild."
-- DG-1: updated_at + AFTER UPDATE trigger.

CREATE TABLE IF NOT EXISTS discord_managed_namespace (
    resource_id TEXT NOT NULL PRIMARY KEY,
    resource_name TEXT,
    guild_id TEXT NOT NULL,
    resource_kind TEXT NOT NULL,
    tagged_at INTEGER NOT NULL,
    tagged_by_site_account_id TEXT NOT NULL,
    tagged_by_site_account_name TEXT,
    tag_reason TEXT,
    untagged_at INTEGER,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_managed_namespace_active
ON discord_managed_namespace (guild_id, resource_kind)
WHERE untagged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discord_managed_namespace_history
ON discord_managed_namespace (guild_id, tagged_at DESC);

CREATE TRIGGER IF NOT EXISTS discord_managed_namespace_updated_at
AFTER UPDATE ON discord_managed_namespace
BEGIN
    UPDATE discord_managed_namespace
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE resource_id = new.resource_id;
END;

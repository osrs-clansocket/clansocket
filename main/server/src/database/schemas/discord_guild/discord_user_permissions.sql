-- discord_user_permissions — per-(guild, user) explicit permission grants (phase 5)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: state table; one row per (guild, user, permission_key).
-- Per-user permissions are independent from discord-side admin role (orthogonal: a
-- discord-side admin still consults clansocket-side permissions for action gating).
-- DG-1: updated_at + AFTER UPDATE trigger.

CREATE TABLE IF NOT EXISTS discord_user_permissions (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    permission_key TEXT NOT NULL,
    granted_at INTEGER NOT NULL,
    granted_by_site_account_id TEXT NOT NULL,
    granted_by_site_account_name TEXT,
    revoked_at INTEGER,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_discord_user_permissions_active
ON discord_user_permissions (guild_id, user_id)
WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discord_user_permissions_grantor
ON discord_user_permissions (granted_by_site_account_id);

CREATE TRIGGER IF NOT EXISTS discord_user_permissions_updated_at
AFTER UPDATE ON discord_user_permissions
BEGIN
    UPDATE discord_user_permissions
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE guild_id = new.guild_id AND user_id = new.user_id AND permission_key = new.permission_key;
END;

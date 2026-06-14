-- discord_servers — the routing table
-- (per D23 — bot_role_position DROPPED per strict D22; sync_status renamed → setup_status)
--
-- Lives in: data/discord_bot.db
-- Role: routing table. Maps guild_id → clan_id → bot_id.
-- Every gateway event consults this on inbound; every "open management ui" consults this on the
-- dashboard side; every outbound discord api call resolves bot from here.
-- Table kind: STATE (latest snapshot, one row per registered guild).
--
-- bot_role_position DROPPED per Q3 (D22 strict): discord serves role positions via
-- GET /guilds/{id}/roles; permission-check computes bot's max position in-memory from API.
-- setup_status (renamed from sync_status): tracks INITIAL ONBOARDING completion
-- (capabilities seeded, audit backfill init), NOT continuous mirror sync (post-D22 no mirror).

CREATE TABLE IF NOT EXISTS discord_servers (
    guild_id TEXT NOT NULL PRIMARY KEY,
    guild_name TEXT NOT NULL,
    guild_icon_hash TEXT,

    clan_id TEXT NOT NULL,
    clan_name TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    bot_name TEXT,

    installer_site_account_id TEXT NOT NULL,
    installer_site_account_name TEXT,
    installer_account_hash TEXT,
    installer_rsn TEXT,

    oauth_scopes_json TEXT NOT NULL,
    permissions_bitfield INTEGER NOT NULL,

    installed_at INTEGER NOT NULL,
    removed_at INTEGER,
    remover_user_id TEXT,
    remover_user_name TEXT,

    last_setup_at INTEGER,
    setup_status TEXT NOT NULL DEFAULT 'pending',
    setup_failure_count INTEGER NOT NULL DEFAULT 0,

    features TEXT NOT NULL DEFAULT '[]',

    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_servers_active_clan
ON discord_servers (clan_id)
WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discord_servers_active_bot
ON discord_servers (bot_id)
WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discord_servers_setup_pending
ON discord_servers (setup_status, last_setup_at)
WHERE setup_status IN ('pending', 'syncing', 'failed');

CREATE TRIGGER IF NOT EXISTS discord_servers_updated_at
AFTER UPDATE ON discord_servers
BEGIN
    UPDATE discord_servers
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE guild_id = new.guild_id;
END;

-- clan_accounts — per-clan unified player-account registry.
--
-- One row per account_hash. Plugin observations (RuneLite identity handshake) and
-- WoM saturation both write here. Plugin is authoritative for account_type when
-- present; WoM fills gaps for mobile-only members (placeholder hashes shaped
-- `wom:<group_id>:<rsn>`).
--
-- This table replaces the legacy plugin_accounts table (which lived in per-mode
-- plugin DBs and conflated plugin identity with WoM-filled identity). One source-
-- of-truth per clan, sourced from either plugin or WoM.

CREATE TABLE IF NOT EXISTS clan_accounts (
    account_hash TEXT PRIMARY KEY,
    first_rsn TEXT NOT NULL,
    latest_rsn TEXT NOT NULL,
    account_type TEXT,
    account_type_source TEXT,
    account_type_updated_at INTEGER,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
);

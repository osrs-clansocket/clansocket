-- clan_wom_identity — per-clan WoM link metadata (non-sensitive, lives in clan.db).
--
-- Singleton row per clan (one WoM group per clan at a time).
-- linker_site_account_id is the manager who pasted the credentials (linker-gate authority).
-- On re-link via upsert, linker is preserved (only group_id + name + updated_at change).
-- Sensitive credentials live in clan_vault.db; this table is the public-metadata + linker bookkeeping.

CREATE TABLE IF NOT EXISTS clan_wom_identity (
    singleton_key TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    linker_site_account_id TEXT NOT NULL,
    wom_group_id INTEGER NOT NULL,
    cached_group_name TEXT NOT NULL,
    last_backfill_at INTEGER,
    last_backfill_status TEXT,
    next_backfill_eligible_at INTEGER,
    set_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK (singleton_key = 'default'),
    CHECK (last_backfill_status IS NULL OR last_backfill_status IN ('completed', 'failed', 'in_progress'))
);

CREATE TRIGGER IF NOT EXISTS clan_wom_identity_updated_at
AFTER UPDATE ON clan_wom_identity
BEGIN
    UPDATE clan_wom_identity
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE singleton_key = new.singleton_key;
END;

-- clan_wom_player_freshness — per-clan, per-member WoM snapshot freshness tracking.
--
-- One row per resolved account_hash (real plugin hash if plugin-connected,
-- placeholder wom:<group_id>:<rsn> if mobile-only).
--
-- last_wom_updated_at holds the WoM player.updatedAt (ms) observed at the time
-- we last saturated this player. The snapshot planner reads this row, compares
-- against the WoM updatedAt in the latest group-details response, and only
-- enqueues a player-snapshot fetch when WoM has newer data than we last wrote.

CREATE TABLE IF NOT EXISTS clan_wom_player_freshness (
    account_hash TEXT NOT NULL PRIMARY KEY,
    wom_player_id INTEGER,
    last_wom_updated_at INTEGER NOT NULL,
    last_saturated_at INTEGER NOT NULL,
    set_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TRIGGER IF NOT EXISTS clan_wom_player_freshness_updated_at
AFTER UPDATE ON clan_wom_player_freshness
BEGIN
    UPDATE clan_wom_player_freshness
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE account_hash = new.account_hash;
END;

-- discord_preset_applications — history of preset applies to target guilds (per D23 — dedup_hash UNIQUE added per DG-6)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: append-only; one row per preset-application event.
-- temp_id_resolution_json maps each preset temp-id to the resolved snowflake in the target guild
-- (drives idempotent re-apply).
-- audit_entry_id links to clan_audit_log.id (cross-db soft FK to per-clan clan_audit.db);
-- platform-actions audit lives in clan_audit_log per the "clansocket audit ≠ discord audit" doctrine.
-- DG-6: dedup_hash UNIQUE added per D23.

CREATE TABLE IF NOT EXISTS discord_preset_applications (
    application_id TEXT NOT NULL PRIMARY KEY,
    preset_id TEXT NOT NULL,
    preset_name TEXT,
    target_guild_id TEXT NOT NULL,
    target_guild_name TEXT,
    applied_at INTEGER NOT NULL,
    applied_by_site_account_id TEXT NOT NULL,
    applied_by_site_account_name TEXT,
    audit_entry_id TEXT,
    temp_id_resolution_json TEXT NOT NULL,
    result_status TEXT NOT NULL DEFAULT 'pending',
    dedup_hash TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_discord_preset_applications_preset
ON discord_preset_applications (preset_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_discord_preset_applications_target
ON discord_preset_applications (target_guild_id, applied_at DESC);

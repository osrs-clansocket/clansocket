-- discord_resource_customizations — clansocket-side metadata overlay on discord resources (per D18 customization layer)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: state table; one row per (resource_kind, resource_id). Polymorphic over resource_kind
-- — same overlay shape for channels, roles, emojis, etc.
-- CCx-1: guild_id required.
-- This is "what we WANT this resource to look like / mean" — distinct from the mirror tables
-- (which capture WHAT DISCORD HAS).
-- The mirror gets overwritten on every sync; this table persists across syncs.
-- resource_kind: 'channel' | 'role' | 'webhook' | 'emoji' | 'sticker' | 'category'
--   | 'soundboard_sound' | 'forum_tag' | 'thread'.
-- Static overrides render in ClanSocket UI only. Dynamic templates render server-side + push to Discord on schedule.

CREATE TABLE IF NOT EXISTS discord_resource_customizations (
    resource_kind TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_name TEXT,
    guild_id TEXT NOT NULL,

    -- static overrides (rendered in ClanSocket UI, NOT pushed to discord)
    custom_name TEXT,
    custom_description TEXT,
    custom_icon_url TEXT,
    custom_color INTEGER,

    -- dynamic templates (rendered server-side, pushed to discord on schedule)
    name_template TEXT,
    description_template TEXT,
    refresh_schedule_json TEXT,                    -- when to re-render + push
    last_rendered_at INTEGER,
    last_pushed_at INTEGER,

    -- gating (flow-driven visibility / accessibility)
    gated_by_flow_id TEXT,                    -- soft FK to flows.db
    gating_rule_json TEXT,

    -- visibility / surface (clansocket-side display, not discord)
    visibility_override TEXT,                    -- 'public' | 'managers_only' | 'hidden'
    sort_position_override INTEGER,

    -- metadata
    tags_json TEXT,
    notes TEXT,

    -- lifecycle
    created_by_site_account_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,

    PRIMARY KEY (resource_kind, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_discord_resource_customizations_guild_kind
ON discord_resource_customizations (guild_id, resource_kind);

CREATE INDEX IF NOT EXISTS idx_discord_resource_customizations_dynamic
ON discord_resource_customizations (guild_id, resource_kind)
WHERE name_template IS NOT NULL OR description_template IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discord_resource_customizations_gated
ON discord_resource_customizations (gated_by_flow_id)
WHERE gated_by_flow_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discord_resource_customizations_refresh_due
ON discord_resource_customizations (last_rendered_at)
WHERE refresh_schedule_json IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS discord_resource_customizations_updated_at
AFTER UPDATE ON discord_resource_customizations
BEGIN
    UPDATE discord_resource_customizations
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE resource_kind = new.resource_kind AND resource_id = new.resource_id;
END;

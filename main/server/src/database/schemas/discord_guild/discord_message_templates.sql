-- discord_message_templates — reusable message + embed templates with variable substitution
-- (per D18 customization layer; D21 kind narrowing; D23 last_rendered_at for uniformity with presence_templates)
--
-- Lives in: clans/<clan_id>/discord_guild_<guild_id>.db
-- Doctrine: state table; one row per template. Flows reference templates by template_id;
-- outbound_events.payload_json holds the RENDERED template at fire time.
-- Variables embed as {var_name} placeholders in content/embed fields.
-- variable_schema_json defines accepted variable names + types + defaults.
--
-- kind discriminator:
--   'message'      — plain content body
--   'embed'        — rich embed body
--   'announcement' — broadcast template
--   'welcome'      — member-join greeting
--
-- Per D21: resource-bound rename templates (dynamic channel names, webhook username overrides)
-- live in discord_resource_customizations.name_template / custom_name.
-- username_template + avatar_url_template cols apply per-send to ad-hoc webhook sends
-- (where the send picks an arbitrary username/avatar via flow, distinct from a webhook's BOUND display name).

CREATE TABLE IF NOT EXISTS discord_message_templates (
    template_id TEXT NOT NULL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    content_template TEXT,
    embeds_json_template TEXT,
    components_json_template TEXT,
    allowed_mentions_json TEXT,

    username_template TEXT,
    avatar_url_template TEXT,

    variable_schema_json TEXT NOT NULL DEFAULT '[]',

    enabled INTEGER NOT NULL DEFAULT 1,
    created_by_site_account_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_rendered_at INTEGER,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_message_templates_guild
ON discord_message_templates (guild_id, kind);

CREATE INDEX IF NOT EXISTS idx_discord_message_templates_active
ON discord_message_templates (guild_id, kind)
WHERE enabled = 1;

CREATE INDEX IF NOT EXISTS idx_discord_message_templates_name
ON discord_message_templates (guild_id, name);

CREATE TRIGGER IF NOT EXISTS discord_message_templates_updated_at
AFTER UPDATE ON discord_message_templates
BEGIN
    UPDATE discord_message_templates
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE template_id = new.template_id;
END;

-- discord_bot_presence_templates — reusable rich presence templates per bot (per D19)
--
-- Lives in: data/discord_bot.db
-- Doctrine: state table, one row per template per bot. Flows swap bot presence by setting
-- discord_bot_identities.active_presence_template_id.
-- Variables embed as {var_name} placeholders in activity_name_template / state_template /
-- details_template / url_template.
-- Pushed to Discord via gateway STATUS_UPDATE opcode (3) on activation OR on schedule refresh.
--
-- activity_type per Discord API: 0=Playing, 1=Streaming, 2=Listening, 3=Watching, 4=Custom, 5=Competing.
-- For type=4 (Custom Status), activity_state_template renders the status text;
-- activity_emoji_* fields render the leading emoji.
-- For type=1 (Streaming), activity_url_template MUST be a Twitch / YouTube URL.
-- For rich presence types (0, 2, 3, 5): activity_details_template + activity_state_template
-- + activity_*_image fields apply.

CREATE TABLE IF NOT EXISTS discord_bot_presence_templates (
    template_id TEXT NOT NULL PRIMARY KEY,
    bot_id TEXT NOT NULL,
    bot_name TEXT,
    name TEXT NOT NULL,
    description TEXT,

    -- presence status (visible alongside the activity)
    status TEXT NOT NULL,        -- 'online' | 'idle' | 'dnd' | 'invisible'
    afk INTEGER NOT NULL DEFAULT 0,
    since_ms INTEGER,                  -- when set, displays "idle for X minutes"

    -- activity core
    activity_type INTEGER NOT NULL,         -- 0=Playing, 1=Streaming, 2=Listening, 3=Watching, 4=Custom, 5=Competing
    activity_name_template TEXT NOT NULL,
    activity_url_template TEXT,                     -- streaming only (type=1)

    -- activity text (rich presence + custom status state)
    activity_details_template TEXT,                     -- rich presence top line
    activity_state_template TEXT,                     -- rich presence bottom line + custom status text (type=4)

    -- activity emoji (custom status)
    activity_emoji_id TEXT,
    activity_emoji_name TEXT,
    activity_emoji_animated INTEGER NOT NULL DEFAULT 0,

    -- activity assets (rich presence images)
    activity_large_image TEXT,                     -- key or external URL
    activity_large_text TEXT,
    activity_small_image TEXT,
    activity_small_text TEXT,

    -- activity buttons (rich presence, max 2)
    activity_buttons_json TEXT,                     -- [{label, url}, {label, url}]

    -- activity timestamps (rich presence "X for Y minutes" display)
    activity_timestamp_start_at INTEGER,
    activity_timestamp_end_at INTEGER,

    -- variable substitution
    variable_schema_json TEXT NOT NULL DEFAULT '[]',

    -- refresh schedule (for dynamic activity_name_template values that need re-rendering)
    refresh_schedule_json TEXT,
    last_rendered_at INTEGER,
    last_pushed_at INTEGER,

    -- lifecycle
    enabled INTEGER NOT NULL DEFAULT 1,
    created_by_site_account_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_bot_presence_templates_bot
ON discord_bot_presence_templates (bot_id);

CREATE INDEX IF NOT EXISTS idx_discord_bot_presence_templates_active
ON discord_bot_presence_templates (bot_id)
WHERE enabled = 1;

CREATE INDEX IF NOT EXISTS idx_discord_bot_presence_templates_refresh_due
ON discord_bot_presence_templates (last_rendered_at)
WHERE refresh_schedule_json IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS discord_bot_presence_templates_updated_at
AFTER UPDATE ON discord_bot_presence_templates
BEGIN
    UPDATE discord_bot_presence_templates
    SET updated_at = (STRFTIME('%s', 'now') * 1000)
    WHERE template_id = new.template_id;
END;

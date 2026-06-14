import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

export interface ActivePresence {
    activity_type: number;
    activity_name: string;
    activity_url: string | null;
    activity_state: string | null;
    activity_details: string | null;
    activity_emoji_id: string | null;
    activity_emoji_name: string | null;
    activity_emoji_animated: number;
    activity_large_image: string | null;
    activity_large_text: string | null;
    activity_small_image: string | null;
    activity_small_text: string | null;
    activity_buttons_json: string | null;
    activity_timestamp_start_at: number | null;
    activity_timestamp_end_at: number | null;
    status: string;
    afk: number;
    since_ms: number | null;
}

interface IdentityRow {
    active_presence_template_id: string | null;
}

interface TemplateRow {
    activity_type: number;
    activity_name_template: string;
    activity_url_template: string | null;
    activity_state_template: string | null;
    activity_details_template: string | null;
    activity_emoji_id: string | null;
    activity_emoji_name: string | null;
    activity_emoji_animated: number;
    activity_large_image: string | null;
    activity_large_text: string | null;
    activity_small_image: string | null;
    activity_small_text: string | null;
    activity_buttons_json: string | null;
    activity_timestamp_start_at: number | null;
    activity_timestamp_end_at: number | null;
    status: string;
    afk: number;
    since_ms: number | null;
}

const TEMPLATE_SQL = `SELECT
    activity_type, activity_name_template, activity_url_template, activity_state_template,
    activity_details_template,
    activity_emoji_id, activity_emoji_name, activity_emoji_animated,
    activity_large_image, activity_large_text, activity_small_image, activity_small_text,
    activity_buttons_json,
    activity_timestamp_start_at, activity_timestamp_end_at,
    status, afk, since_ms
FROM discord_bot_presence_templates WHERE template_id = ? AND enabled = 1`;

function projectTemplate(t: TemplateRow): ActivePresence {
    return {
        activity_type: t.activity_type,
        activity_name: t.activity_name_template,
        activity_url: t.activity_url_template,
        activity_state: t.activity_state_template,
        activity_details: t.activity_details_template,
        activity_emoji_id: t.activity_emoji_id,
        activity_emoji_name: t.activity_emoji_name,
        activity_emoji_animated: t.activity_emoji_animated,
        activity_large_image: t.activity_large_image,
        activity_large_text: t.activity_large_text,
        activity_small_image: t.activity_small_image,
        activity_small_text: t.activity_small_text,
        activity_buttons_json: t.activity_buttons_json,
        activity_timestamp_start_at: t.activity_timestamp_start_at,
        activity_timestamp_end_at: t.activity_timestamp_end_at,
        status: t.status,
        afk: t.afk,
        since_ms: t.since_ms,
    };
}

export function getActivePresence(botId: string): ActivePresence | null {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const identity = db
        .prepare(`SELECT active_presence_template_id FROM discord_bot_identities WHERE bot_id = ?`)
        .get(botId) as IdentityRow | undefined;
    if (!identity?.active_presence_template_id) return null;
    const template = db.prepare(TEMPLATE_SQL).get(identity.active_presence_template_id) as TemplateRow | undefined;
    if (!template) return null;
    return projectTemplate(template);
}

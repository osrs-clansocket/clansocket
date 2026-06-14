import logger from "@clansocket/logger";
import type { Client } from "discord.js";
import { loadPresence } from "../loaders/presence-loader.js";
import type { BotIdentity } from "../shared/types/bot-types.js";
import type { PresenceButton, PresenceTemplate } from "../shared/types/presence-types.js";

const DEFAULT_ACTIVITY_TYPE = 3;
const DEFAULT_ACTIVITY_NAME = "ClanSocket";
const DEFAULT_STATUS = "online";
const AFK_TRUE = 1;
const ANIMATED_TRUE = 1;
const NULL_SENTINEL: null = null;

function buildEmoji(t: PresenceTemplate): Record<string, unknown> | null {
    if (!t.activity_emoji_id && !t.activity_emoji_name) return NULL_SENTINEL;
    const emoji: Record<string, unknown> = {};
    if (t.activity_emoji_id) emoji.id = t.activity_emoji_id;
    if (t.activity_emoji_name) emoji.name = t.activity_emoji_name;
    if (t.activity_emoji_animated === ANIMATED_TRUE) emoji.animated = true;
    return emoji;
}

function buildAssets(t: PresenceTemplate): Record<string, unknown> | null {
    if (!t.activity_large_image && !t.activity_small_image && !t.activity_large_text && !t.activity_small_text) {
        return NULL_SENTINEL;
    }
    const assets: Record<string, unknown> = {};
    if (t.activity_large_image) assets.large_image = t.activity_large_image;
    if (t.activity_large_text) assets.large_text = t.activity_large_text;
    if (t.activity_small_image) assets.small_image = t.activity_small_image;
    if (t.activity_small_text) assets.small_text = t.activity_small_text;
    return assets;
}

function buildTimestamps(t: PresenceTemplate): Record<string, unknown> | null {
    if (!t.activity_timestamp_start_at && !t.activity_timestamp_end_at) return NULL_SENTINEL;
    const ts: Record<string, unknown> = {};
    if (t.activity_timestamp_start_at) ts.start = t.activity_timestamp_start_at;
    if (t.activity_timestamp_end_at) ts.end = t.activity_timestamp_end_at;
    return ts;
}

function buildButtons(t: PresenceTemplate): PresenceButton[] | null {
    if (!t.activity_buttons_json) return NULL_SENTINEL;
    try {
        const parsed = JSON.parse(t.activity_buttons_json) as PresenceButton[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : NULL_SENTINEL;
    } catch {
        return NULL_SENTINEL;
    }
}

function buildActivity(t: PresenceTemplate): Record<string, unknown> {
    const activity: Record<string, unknown> = { name: t.activity_name, type: t.activity_type };
    if (t.activity_url) activity.url = t.activity_url;
    if (t.activity_state) activity.state = t.activity_state;
    if (t.activity_details) activity.details = t.activity_details;
    const emoji = buildEmoji(t);
    if (emoji) activity.emoji = emoji;
    const assets = buildAssets(t);
    if (assets) activity.assets = assets;
    const timestamps = buildTimestamps(t);
    if (timestamps) activity.timestamps = timestamps;
    const buttons = buildButtons(t);
    if (buttons) activity.buttons = buttons;
    return activity;
}

async function applyPresence(client: Client, identity: BotIdentity): Promise<void> {
    try {
        const template = await loadPresence(identity.bot_id);
        const status = (template?.status ?? DEFAULT_STATUS) as "online" | "idle" | "dnd" | "invisible";
        const activity = template
            ? buildActivity(template)
            : { name: DEFAULT_ACTIVITY_NAME, type: DEFAULT_ACTIVITY_TYPE };
        const presence: Record<string, unknown> = { status, activities: [activity] };
        if (template?.afk === AFK_TRUE) presence.afk = true;
        if (template?.since_ms) presence.since = template.since_ms;
        client.user!.setPresence(presence as never);
    } catch (err: any) {
        logger.warn(`Presence update failed for ${identity.bot_id}: ${err}`);
    }
}

export { applyPresence };

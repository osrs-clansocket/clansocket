import type { ModeKey, ModeMeta, ModeTier } from "./types.js";

const LIVE: ModeTier = "live";
const CAPABILITIES: ModeTier = "capabilities";
const PERSONALITY: ModeTier = "personality";
const OPERATING: ModeTier = "operating";

const ON = true;
const OFF = false;

const TRACKER_DEPS: readonly ModeKey[] = ["mode_db_queries"];
const ACTION_OP_DEPS: readonly ModeKey[] = ["mode_dashboard_actions"];

type ModeTuple = readonly [
    key: ModeKey,
    tier: ModeTier,
    displayName: string,
    icon: string,
    defaultOn: boolean,
    dependsOn?: readonly ModeKey[],
];

const TUPLES: readonly ModeTuple[] = [
    ["mode_continuous", LIVE, "Continuous mode", "broadcast", OFF],

    ["mode_dashboard_actions", CAPABILITIES, "Dashboard actions", "cursor", ON],
    ["mode_db_queries", CAPABILITIES, "DB queries", "database", ON],
    ["mode_memory_authoring", CAPABILITIES, "Memory authoring", "journal-bookmark", ON],
    ["mode_pin_unpin", CAPABILITIES, "Pin / unpin", "pin-angle", ON],
    ["mode_profile_updates", CAPABILITIES, "Profile updates", "person-vcard", ON],
    ["mode_suggested_replies", CAPABILITIES, "Suggested replies", "chat-quote", ON],

    ["mode_banter", PERSONALITY, "Banter", "fire", ON],
    ["mode_inside_jokes", PERSONALITY, "Inside jokes", "emoji-laughing", ON],
    ["mode_spontaneous_reactions", PERSONALITY, "Spontaneous reactions", "graph-up", ON],

    ["mode_op_action", OPERATING, "Action mode", "play-circle", ON, ACTION_OP_DEPS],
    ["mode_op_guide", OPERATING, "Guide mode", "compass", ON],
    ["mode_op_tracker", OPERATING, "Tracker mode", "bar-chart", ON, TRACKER_DEPS],
];

function buildMode(tuple: ModeTuple): ModeMeta {
    const [key, tier, displayName, icon, defaultOn, dependsOn] = tuple;
    const base: ModeMeta = { key, tier, displayName, icon, defaultOn };
    return dependsOn !== undefined ? { ...base, dependsOn } : base;
}

export const CLIENT_MODES: readonly ModeMeta[] = TUPLES.map(buildMode);

export const MODE_BY_KEY: ReadonlyMap<ModeKey, ModeMeta> = new Map(CLIENT_MODES.map((m) => [m.key, m]));

export function modesByTier(tier: ModeTier): readonly ModeMeta[] {
    return CLIENT_MODES.filter((m) => m.tier === tier);
}

export function defaultOnFor(key: ModeKey): boolean {
    return MODE_BY_KEY.get(key)?.defaultOn ?? false;
}

export function dependenciesOf(key: ModeKey): readonly ModeKey[] {
    return MODE_BY_KEY.get(key)?.dependsOn ?? [];
}

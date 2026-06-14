export const PROSE = "prose" as const;
export const NUMBER = "number" as const;

export const IDENTITY = "identity" as const;
export const ENGAGEMENT = "engagement" as const;
export const POLICY = "policy" as const;
export const DOMAIN = "domain" as const;

export const CTRL_ENTRY = "entry" as const;
export const CTRL_BLOCK = "block" as const;
export const CTRL_NUMBER = "number" as const;
export const CTRL_RANGE = "range" as const;
export const CTRL_TOGGLE = "toggle" as const;
export const CTRL_SELECT = "select" as const;

export type SlotType = typeof PROSE | typeof NUMBER;
export type SlotTier = typeof IDENTITY | typeof ENGAGEMENT | typeof POLICY | typeof DOMAIN;
export type ControlType =
    | typeof CTRL_ENTRY
    | typeof CTRL_BLOCK
    | typeof CTRL_NUMBER
    | typeof CTRL_RANGE
    | typeof CTRL_TOGGLE
    | typeof CTRL_SELECT;

export interface SlotBounds {
    readonly min?: number;
    readonly max?: number;
}

export interface SlotMeta {
    readonly key: string;
    readonly tier: SlotTier;
    readonly type: SlotType;
    readonly control: ControlType;
    readonly displayName: string;
    readonly icon: string;
    readonly description: string;
    readonly bounds?: SlotBounds;
    readonly options?: readonly string[];
    readonly requiresMode?: string;
}

type SlotTuple = readonly [
    key: string,
    type: SlotType,
    control: ControlType,
    displayName: string,
    icon: string,
    description: string,
    extras?: { bounds?: SlotBounds; options?: readonly string[]; requiresMode?: string },
];

const IDENTITY_TUPLES: readonly SlotTuple[] = [
    ["ai_name", PROSE, CTRL_ENTRY, "Name", "person-badge", "Display name shown in the chat."],
    ["ai_role_tagline", PROSE, CTRL_ENTRY, "Role", "card-text", "One sentence describing what the AI does."],
    [
        "ai_idk_form",
        PROSE,
        CTRL_ENTRY,
        "Uncertainty phrasing",
        "question-circle",
        "How the AI says it doesn't know something.",
    ],
    [
        "ai_voice_directive",
        PROSE,
        CTRL_BLOCK,
        "Voice intro",
        "megaphone",
        "One-line voice statement: tone + register the AI should hit.",
    ],
    [
        "ai_voice_dna",
        PROSE,
        CTRL_BLOCK,
        "Voice rules",
        "fingerprint",
        "Inviolable rules the AI's voice always follows.",
    ],
    [
        "ai_anti_voice",
        PROSE,
        CTRL_BLOCK,
        "Never say",
        "shield-slash",
        "Phrases or patterns the AI must avoid in its output.",
    ],
    [
        "ai_phrase_banks",
        PROSE,
        CTRL_BLOCK,
        "Vocab",
        "collection",
        "Words + phrases the AI uses when reacting (laughs, hi, agreeing, etc.).",
    ],
    [
        "ai_shittalk_doctrine",
        PROSE,
        CTRL_BLOCK,
        "Banter style",
        "fire",
        "When + how the AI roasts back. Data-driven only — never fabricated.",
    ],
    [
        "ai_inside_jokes",
        PROSE,
        CTRL_BLOCK,
        "Inside jokes",
        "emoji-laughing",
        "Cultural touchstones the AI uses without explaining.",
        { requiresMode: "mode_inside_jokes" },
    ],
    ["ai_lane_out", PROSE, CTRL_BLOCK, "What to refuse", "sign-do-not-enter", "Topics the AI refuses to engage with."],
    [
        "ai_deflect_phrasings",
        PROSE,
        CTRL_BLOCK,
        "How to refuse",
        "arrow-return-left",
        "Lines the AI uses when refusing.",
    ],
    [
        "ai_reaction_calibration",
        PROSE,
        CTRL_BLOCK,
        "Reaction levels",
        "graph-up",
        "How loud or quiet the AI is per event significance.",
    ],
    ["ai_celebration_rules", PROSE, CTRL_BLOCK, "Celebration style", "trophy", "How the AI acknowledges wins."],
    ["ai_fumble_recovery", PROSE, CTRL_BLOCK, "Mistake recovery", "bandaid", "How the AI handles its own misses."],
    [
        "ai_swear_policy",
        PROSE,
        CTRL_BLOCK,
        "Profanity style",
        "chat-square-text",
        "How the AI handles swearing + censoring.",
    ],
];

const ADDRESS_OPTIONS = ["rsn", "nickname", "display-name", "none"] as const;
const PRONOUN_OPTIONS = ["she/her", "he/him", "they/them", "it", "none"] as const;
const REACTION_CEILING_OPTIONS = ["muted", "normal", "high"] as const;
const TIME_FMT_OPTIONS = ["12h", "24h"] as const;
const DATE_FMT_OPTIONS = ["DMY", "MDY", "YMD", "ISO"] as const;

const ENGAGEMENT_TUPLES: readonly SlotTuple[] = [
    [
        "ai_address_form",
        PROSE,
        CTRL_TOGGLE,
        "Address form",
        "at",
        "How the AI addresses you.",
        { options: ADDRESS_OPTIONS },
    ],
    [
        "ai_pronouns",
        PROSE,
        CTRL_SELECT,
        "Pronouns",
        "person",
        "Third-person pronouns for you.",
        { options: PRONOUN_OPTIONS },
    ],
    [
        "ai_time_format",
        PROSE,
        CTRL_TOGGLE,
        "Time format",
        "alarm",
        "12h vs 24h time rendering.",
        { options: TIME_FMT_OPTIONS },
    ],
    [
        "ai_date_format",
        PROSE,
        CTRL_TOGGLE,
        "Date format",
        "calendar3",
        "Date format preference.",
        { options: DATE_FMT_OPTIONS },
    ],
    [
        "ai_reaction_ceiling",
        PROSE,
        CTRL_TOGGLE,
        "Reaction cap",
        "thermometer-half",
        "Max intensity the AI can reach — mutes spontaneous reactions if low.",
        { options: REACTION_CEILING_OPTIONS },
    ],
    [
        "ai_verbosity_default",
        PROSE,
        CTRL_BLOCK,
        "Default verbosity",
        "text-paragraph",
        "How long the AI's default responses are.",
    ],
    [
        "ai_markdown_policy",
        PROSE,
        CTRL_BLOCK,
        "Markdown style",
        "markdown",
        "When the AI uses markdown formatting in messages.",
    ],
    [
        "ai_time_narration_policy",
        PROSE,
        CTRL_BLOCK,
        "Time mentions",
        "clock-history",
        "When the AI mentions the time of day in chat.",
    ],
];

const POLICY_TUPLES: readonly SlotTuple[] = [
    [
        "ai_chain_auto_limit",
        NUMBER,
        CTRL_RANGE,
        "Max chained turns",
        "link-45deg",
        "Hard cap on consecutive automatic AI turns before stopping.",
        { bounds: { min: 3, max: 20 } },
    ],
    [
        "ai_chain_auto_limit_warn_at",
        NUMBER,
        CTRL_RANGE,
        "Soft stop at",
        "exclamation-triangle",
        "Round at which the AI starts wrapping up, even if not done.",
        { bounds: { min: 2, max: 19 } },
    ],
    [
        "ai_poll_min_seconds",
        NUMBER,
        CTRL_RANGE,
        "Fastest check rate",
        "speedometer2",
        "In continuous mode, minimum seconds between live state checks.",
        { bounds: { min: 5, max: 60 } },
    ],
    [
        "ai_poll_max_seconds",
        NUMBER,
        CTRL_RANGE,
        "Slowest check rate",
        "speedometer",
        "In continuous mode, maximum seconds between live state checks.",
        { bounds: { min: 60, max: 600 } },
    ],
    [
        "ai_history_window",
        NUMBER,
        CTRL_RANGE,
        "Chat memory window",
        "list-ol",
        "How many of your recent messages the AI keeps in working memory.",
        { bounds: { min: 5, max: 50 } },
    ],
    [
        "ai_clarify_threshold",
        PROSE,
        CTRL_BLOCK,
        "When to ask",
        "question-square",
        "How readily the AI asks for clarification vs proceeds with its best guess.",
    ],
    [
        "ai_suggestion_policy",
        PROSE,
        CTRL_BLOCK,
        "Suggest next message",
        "lightbulb",
        "When the AI offers a one-liner you could reply with.",
        { requiresMode: "mode_suggested_replies" },
    ],
    [
        "ai_discovery_verbosity",
        PROSE,
        CTRL_BLOCK,
        "Data probing depth",
        "search",
        "How thoroughly the AI explores your data before answering.",
        { requiresMode: "mode_db_queries" },
    ],
    [
        "ai_quiet_hours",
        PROSE,
        CTRL_BLOCK,
        "Quiet hours",
        "moon-stars",
        "Time ranges when the AI delays or batches non-urgent updates.",
    ],
];

const DOMAIN_TUPLES: readonly SlotTuple[] = [
    [
        "ai_domain_priorities",
        PROSE,
        CTRL_BLOCK,
        "Surface priorities",
        "compass",
        "Which kinds of events the AI eagerly narrates vs treats as routine.",
    ],
    [
        "ai_watched_rsns",
        PROSE,
        CTRL_BLOCK,
        "Watched accounts",
        "binoculars",
        "Specific RSNs the AI gives extra narration weight.",
    ],
    [
        "ai_topic_avoids",
        PROSE,
        CTRL_BLOCK,
        "Suppressed topics",
        "ban",
        "Topics or event classes the AI never narrates.",
    ],
];

const TIER_GROUPS: readonly (readonly [SlotTier, readonly SlotTuple[]])[] = [
    [IDENTITY, IDENTITY_TUPLES],
    [ENGAGEMENT, ENGAGEMENT_TUPLES],
    [POLICY, POLICY_TUPLES],
    [DOMAIN, DOMAIN_TUPLES],
];

function buildSlot(tier: SlotTier, tuple: SlotTuple): SlotMeta {
    const [key, type, control, displayName, icon, description, extras] = tuple;
    const base: SlotMeta = { key, tier, type, control, displayName, icon, description };
    return {
        ...base,
        ...(extras?.bounds !== undefined && { bounds: extras.bounds }),
        ...(extras?.options !== undefined && { options: extras.options }),
        ...(extras?.requiresMode !== undefined && { requiresMode: extras.requiresMode }),
    };
}

export const CLIENT_SLOTS: readonly SlotMeta[] = TIER_GROUPS.flatMap(([tier, tuples]) =>
    tuples.map((t) => buildSlot(tier, t)),
);

export const SLOT_BY_KEY: ReadonlyMap<string, SlotMeta> = new Map(CLIENT_SLOTS.map((s) => [s.key, s]));

export function slotsByTier(tier: SlotTier): readonly SlotMeta[] {
    return CLIENT_SLOTS.filter((s) => s.tier === tier);
}

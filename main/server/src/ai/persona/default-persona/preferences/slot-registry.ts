const PROSE = "prose" as const;
const NUMBER = "number" as const;

const IDENTITY_TIER = "identity" as const;
const ENGAGEMENT_TIER = "engagement" as const;
const POLICY_TIER = "policy" as const;
const DOMAIN_TIER = "domain" as const;

const RUNTIME_COUPLED = true as const;

export type SlotType = typeof PROSE | typeof NUMBER;

export type SlotTier = typeof IDENTITY_TIER | typeof ENGAGEMENT_TIER | typeof POLICY_TIER | typeof DOMAIN_TIER;

export interface SlotBounds {
    readonly min?: number;
    readonly max?: number;
}

export interface SlotDef {
    readonly key: string;
    readonly tier: SlotTier;
    readonly type: SlotType;
    readonly description: string;
    readonly bounds?: SlotBounds;
    readonly runtimeCoupled?: typeof RUNTIME_COUPLED;
}

type SlotTuple = readonly [
    key: string,
    type: SlotType,
    description: string,
    bounds?: SlotBounds,
    runtimeCoupled?: typeof RUNTIME_COUPLED,
];

const IDENTITY_SLOTS: readonly SlotTuple[] = [
    ["ai_name", PROSE, "display name (1 word)"],
    ["ai_role_tagline", PROSE, "one-line role"],
    ["ai_voice_directive", PROSE, "voice DNA opener"],
    ["ai_lane_out", PROSE, "out-of-lane narrowing (cannot widen platform mandate)"],
    ["ai_deflect_phrasings", PROSE, "how to deflect out-of-lane asks"],
    ["ai_idk_form", PROSE, "how to say i dont know"],
    ["ai_phrase_banks", PROSE, "ranked phrase banks per slot"],
    ["ai_shittalk_doctrine", PROSE, "banter doctrine"],
    ["ai_inside_jokes", PROSE, "tenant inside jokes"],
    ["ai_voice_dna", PROSE, "inviolable voice rules"],
    ["ai_reaction_calibration", PROSE, "reaction intensity scaling"],
    ["ai_anti_voice", PROSE, "banned output patterns"],
    ["ai_celebration_rules", PROSE, "how to celebrate wins"],
    ["ai_fumble_recovery", PROSE, "how to recover from misses"],
    ["ai_swear_policy", PROSE, "profanity policy"],
];

const ENGAGEMENT_SLOTS: readonly SlotTuple[] = [
    ["ai_verbosity_default", PROSE, "default response length / coverage style"],
    ["ai_markdown_policy", PROSE, "when + how to use markdown"],
    ["ai_time_narration_policy", PROSE, "when to mention time-of-day"],
    ["ai_address_form", PROSE, "how to address the user"],
    ["ai_pronouns", PROSE, "third-person pronouns for the user"],
    ["ai_reaction_ceiling", PROSE, "max reaction intensity ceiling"],
    ["ai_time_format", PROSE, "12h vs 24h time rendering"],
    ["ai_date_format", PROSE, "date format preference"],
];

const POLICY_SLOTS: readonly SlotTuple[] = [
    ["ai_chain_auto_limit", NUMBER, "max auto-chain rounds before forced stop", { min: 3, max: 20 }, RUNTIME_COUPLED],
    [
        "ai_chain_auto_limit_warn_at",
        NUMBER,
        "round at which to set chain:false even if not done",
        { min: 2, max: 19 },
        RUNTIME_COUPLED,
    ],
    [
        "ai_poll_min_seconds",
        NUMBER,
        "lower bound on next_poll_seconds in continuous mode",
        { min: 5, max: 60 },
        RUNTIME_COUPLED,
    ],
    [
        "ai_poll_max_seconds",
        NUMBER,
        "upper bound on next_poll_seconds in continuous mode",
        { min: 60, max: 600 },
        RUNTIME_COUPLED,
    ],
    ["ai_history_window", NUMBER, "how many session turns kept in profile", { min: 5, max: 50 }, RUNTIME_COUPLED],
    ["ai_clarify_threshold", PROSE, "when to ask the user vs infer-and-proceed"],
    ["ai_suggestion_policy", PROSE, "when to offer suggested_user_response"],
    ["ai_discovery_verbosity", PROSE, "how thorough to be when discovering col semantics"],
    ["ai_quiet_hours", PROSE, "time-of-day cadence gating"],
];

const DOMAIN_SLOTS: readonly SlotTuple[] = [
    ["ai_domain_priorities", PROSE, "which event classes get eager narration"],
    ["ai_watched_rsns", PROSE, "rsns with elevated narration priority"],
    ["ai_topic_avoids", PROSE, "topics / event classes to suppress"],
];

const TIER_GROUPS: readonly (readonly [SlotTier, readonly SlotTuple[]])[] = [
    [IDENTITY_TIER, IDENTITY_SLOTS],
    [ENGAGEMENT_TIER, ENGAGEMENT_SLOTS],
    [POLICY_TIER, POLICY_SLOTS],
    [DOMAIN_TIER, DOMAIN_SLOTS],
];

function buildSlotDef(tier: SlotTier, tuple: SlotTuple): SlotDef {
    const [key, type, description, bounds, runtimeCoupled] = tuple;
    const base: SlotDef = { key, tier, type, description };
    return {
        ...base,
        ...(bounds !== undefined && { bounds }),
        ...(runtimeCoupled !== undefined && { runtimeCoupled }),
    };
}

export const SLOT_REGISTRY: readonly SlotDef[] = TIER_GROUPS.flatMap(([tier, slots]) =>
    slots.map((tuple) => buildSlotDef(tier, tuple)),
);

const LOCKED_PREFIXES: readonly string[] = [
    "wire_",
    "output_field_",
    "dom_verb_",
    "recap_field_",
    "marker_",
    "memory_op_",
    "profile_bucket_",
];

export const CONFIGURABLE_KEYS: ReadonlySet<string> = new Set(SLOT_REGISTRY.map((s) => s.key));

export function isConfigurableKey(key: string): boolean {
    if (LOCKED_PREFIXES.some((p) => key.startsWith(p))) return false;
    return CONFIGURABLE_KEYS.has(key);
}

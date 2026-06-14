import type { ModeKey } from "../../ai/modes-store/index.js";

export type ConcernRow = string | readonly string[];

export interface ConcernDef {
    readonly id: string;
    readonly title: string;
    readonly icon: string;
    readonly rows: readonly ConcernRow[];
    readonly defaultOpen?: true;
    readonly requiresMode?: ModeKey;
}

export interface TabConcerns {
    readonly concerns: readonly ConcernDef[];
}

const DEFAULT_OPEN = true as const;

export const PERSONA_TAB: TabConcerns = {
    concerns: [
        {
            id: "identity",
            title: "Identity",
            icon: "person-badge",
            defaultOpen: DEFAULT_OPEN,
            rows: [["ai_name", "ai_role_tagline"], "ai_idk_form"],
        },
        {
            id: "voice",
            title: "Voice",
            icon: "megaphone",
            rows: ["ai_voice_directive", "ai_voice_dna", "ai_anti_voice"],
        },
        {
            id: "vocab",
            title: "Vocab",
            icon: "collection",
            rows: ["ai_phrase_banks"],
        },
        {
            id: "banter",
            title: "Banter",
            icon: "fire",
            rows: ["ai_shittalk_doctrine", "ai_inside_jokes"],
            requiresMode: "mode_banter",
        },
        {
            id: "refusals",
            title: "Refusals",
            icon: "sign-do-not-enter",
            rows: ["ai_lane_out", "ai_deflect_phrasings"],
        },
        {
            id: "reactions",
            title: "Reactions",
            icon: "graph-up",
            rows: ["ai_reaction_calibration", "ai_celebration_rules", "ai_fumble_recovery", "ai_swear_policy"],
            requiresMode: "mode_spontaneous_reactions",
        },
    ],
};

export const OPERATION_TAB: TabConcerns = {
    concerns: [
        {
            id: "cadence-limits",
            title: "Cadence & limits",
            icon: "speedometer",
            defaultOpen: DEFAULT_OPEN,
            rows: [
                ["ai_chain_auto_limit_warn_at", "ai_chain_auto_limit"],
                ["ai_poll_min_seconds", "ai_poll_max_seconds"],
                "ai_history_window",
            ],
            requiresMode: "mode_continuous",
        },
        {
            id: "decision-policy",
            title: "Decision policy",
            icon: "diagram-3",
            rows: ["ai_clarify_threshold", "ai_suggestion_policy", "ai_discovery_verbosity"],
        },
        {
            id: "quiet-hours",
            title: "Quiet hours",
            icon: "moon-stars",
            rows: ["ai_quiet_hours"],
            requiresMode: "mode_continuous",
        },
    ],
};

export const PREFERENCES_TAB: TabConcerns = {
    concerns: [
        {
            id: "addressing",
            title: "Addressing you",
            icon: "at",
            defaultOpen: DEFAULT_OPEN,
            rows: [["ai_address_form", "ai_pronouns"]],
        },
        {
            id: "display-format",
            title: "Display format",
            icon: "calendar3",
            rows: [["ai_time_format", "ai_date_format"]],
        },
        {
            id: "output-style",
            title: "Output style",
            icon: "text-paragraph",
            rows: ["ai_reaction_ceiling", "ai_verbosity_default", "ai_markdown_policy", "ai_time_narration_policy"],
        },
        {
            id: "domain-focus",
            title: "Domain focus",
            icon: "compass",
            rows: ["ai_domain_priorities", "ai_watched_rsns", "ai_topic_avoids"],
            requiresMode: "mode_continuous",
        },
    ],
};

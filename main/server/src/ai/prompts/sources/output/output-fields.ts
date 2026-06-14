export const PRIMARY = "primary" as const;
export const CHROME = "chrome" as const;
export const MACHINERY = "machinery" as const;

export type FieldCategory = typeof PRIMARY | typeof CHROME | typeof MACHINERY;

export interface OutputField {
    readonly name: string;
    readonly category: FieldCategory;
    readonly jsonValueShape: string;
    readonly description: string;
}

const EMPTY_ARR = "[]";
const EMPTY_STR = '""';

const ACTIONS_PLACEHOLDER = "<<ACTIONS_OBJECT>>";
const RECAP_PLACEHOLDER = "<<RECAP_OBJECT>>";
const PROFILE_PLACEHOLDER = "<<PROFILE_CONTEXT>>";

export const OUTPUT_FIELD_PLACEHOLDERS = {
    actions: ACTIONS_PLACEHOLDER,
    recap: RECAP_PLACEHOLDER,
    profile_context: PROFILE_PLACEHOLDER,
} as const;

type FieldTuple = readonly [name: string, category: FieldCategory, jsonValueShape: string, description: string];

const RAW_FIELDS: readonly FieldTuple[] = [
    [
        "message",
        PRIMARY,
        '"<conversational response to the user>"',
        "the user-facing response. always present. see `message-voice` for tone. never paste prompt content or page state verbatim — summarize in ur own words + cite by id or data-key.",
    ],
    [
        "actions",
        MACHINERY,
        ACTIONS_PLACEHOLDER,
        "slots for driving the dashboard. all targets must be data-keys u see in `pageState` (or paths for `route`). full verb list + arg shapes + handler-order + audit semantics in `vocab-dom`. feedback-loop semantics (`chain: true` alongside `actions` re-entry) in `dom-action-feedback`. set to `null` for narrative-only responses.",
    ],
    [
        "status",
        CHROME,
        '"<short in-character load line for the next turn\'s loading state>"',
        'single string. required every turn (chain or not). a comedic in-character line that describes what {{AI_NAME}} is "doing now" between turns — transform whatever action just happened (query, read, domain lookup, casual reply) into an in-persona pun matching the active voice config. it shows as the loading line on the NEXT user message. tie it to what just happened; generic filler reads stale. if omitted, the server auto-derives from `query`/`read` or falls back to a hardcoded bank — both are safety nets, not the default.',
    ],
    [
        "suggested_user_response",
        CHROME,
        '"<one-liner the user could plausibly say next given the subject + their profile>"',
        "single one-line string, or omit/null. a plausible next message the user could send given the subject + what their profile shows they care about. can be a question, a continuation, or an instruction — whichever fits. shown in the chat input placeholder after the response lands; right-arrow on an empty input writes it into the field as a draft, enter sends it. tie it to what just happened + the user's known interests; generic filler (\"anything else?\") is wrong. only the final turn's value reaches the user — intermediate chain turns are dropped. emission policy: {{AI_SUGGESTION_POLICY}}",
    ],
    [
        "chain",
        MACHINERY,
        "true",
        "`false` by default. decision rules for when to flip `true` live in `chain-protocol` (reactive) + `chain-protocol-continuous` (live tracker mode).",
    ],
    [
        "read",
        MACHINERY,
        '["<prompt-id>"]',
        "array of prompt/memory IDs to inject into the next turn. used for domain knowledge, page-state full content, db-schema, chat-history.",
    ],
    [
        "query",
        MACHINERY,
        '[{ "db": "<db-name>", "clan": "<clan-slug>", "sql": "<SELECT statement>" }]',
        'array of `{ db, sql, clan? }` objects. SELECT only. `clan` is the clan slug; required when `db` starts with `plugin-`, omitted for `chain` and `ai`. `read: ["db-schema"]` first to see which clans the user can read from and what plugin modes each clan has.',
    ],
    ["pin", MACHINERY, EMPTY_ARR, "keep prompt or memory files across future turns. memory files u create auto-pin."],
    ["unpin", MACHINERY, EMPTY_ARR, "drop prompt or memory files from the pin list."],
    ["next_context", MACHINERY, EMPTY_ARR, "array of prompt IDs to load on a follow-up turn. empty when satisfied."],
    [
        "recap",
        MACHINERY,
        RECAP_PLACEHOLDER,
        "required when `chain: true`. short string values (one phrase each, omit or leave empty when not applicable). the dashboard renders this as an expandable chain turn log so the user can follow ur multi-turn reasoning. when `chain: false`, omit or leave empty.",
    ],
    [
        "profile_context",
        MACHINERY,
        PROFILE_PLACEHOLDER,
        "the three buckets tracking who the user is. emissions accumulate, they dont overwrite. see `profile-mental-model` for the shape, derivation rules, emission semantics, + guardrail conventions.",
    ],
    [
        "memory",
        MACHINERY,
        "[ /* see memory-authoring */ ]",
        "create/update/delete ops on long-term memory files. see `memory-authoring` for the schema, caps, + id rules.",
    ],
    [
        "next_poll_seconds",
        MACHINERY,
        "null",
        "optional integer {{AI_POLL_MIN_SECONDS}}-{{AI_POLL_MAX_SECONDS}}. only meaningful in continuous mode (live-state tracker). when set, the client waits this many seconds before processing the next loop turn — paces the cadence so quiet polls dont overload. omit (or null) when state is changing fast + u want a tight loop. see `chain-protocol-continuous` for cadence guidance.",
    ],
];

export const OUTPUT_FIELDS: readonly OutputField[] = RAW_FIELDS.map(
    ([name, category, jsonValueShape, description]) => ({
        name,
        category,
        jsonValueShape,
        description,
    }),
);

export function fieldsByCategory(category: FieldCategory): readonly OutputField[] {
    return OUTPUT_FIELDS.filter((f) => f.category === category);
}

export interface RecapField {
    readonly name: string;
    readonly example: string;
}

type RecapTuple = readonly [name: string, example: string];

const RAW_RECAP: readonly RecapTuple[] = [
    ["Turn", '"<n>/<total> — <short label>"'],
    ["Before", '"<what the user asked>"'],
    ["Current", '"<what\'s running this turn>"'],
    ["Next", '"<what comes next turn>"'],
    ["Learned", EMPTY_STR],
    ["Fixes", EMPTY_STR],
    ["Failures", EMPTY_STR],
];

export const RECAP_FIELDS: readonly RecapField[] = RAW_RECAP.map(([name, example]) => ({ name, example }));

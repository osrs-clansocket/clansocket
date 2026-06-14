import { SESSION_TURN_TRIM } from "../limits.js";

export type MergeMode = "surgical-merge" | "append-only" | "overwrite";

export interface ProfileBucket {
    readonly name: string;
    readonly mergeMode: MergeMode;
    readonly description: string;
    readonly exampleShape: string;
    readonly omitBehavior: string;
}

type BucketTuple = readonly [
    name: string,
    mergeMode: MergeMode,
    description: string,
    exampleShape: string,
    omitBehavior: string,
];

const RAW_BUCKETS: readonly BucketTuple[] = [
    [
        "identity",
        "surgical-merge",
        "cross-session facts about the user — flat key/value dict. emit ONLY the keys u are creating, updating, or explicitly removing this turn. previous keys persist untouched. entries here are stable invariants — rsn, terminology style, guardrails, playstyle, committed regions.",
        '{ "<stable-invariant-key>": "<derived value>" }',
        "emitting no `identity` key at all is fine when this turn established no new identity signal. emit a key with value `null` only to explicitly remove it.",
    ],
    [
        "session",
        "append-only",
        `u emit ONE new entry describing what just happened. server appends with an auto-assigned turn number + trims history to the last ${SESSION_TURN_TRIM} turns. entries are chronological, never rewritten.`,
        '{ "they": "<derived user signal>", "i": "<what was done in response>", "learned": "<derivation worth future-turn consultation>" }',
        "omit the whole `session` key if this turn has no meaningful signal (pure machinery turns, trivial acks).",
    ],
    [
        "focus",
        "overwrite",
        "single string describing what the current conversation thread is about. overwrite each turn with the tightest phrase that captures it.",
        '"<current thread phrase>"',
        "if omitted from emission: previous value retained. emit `null` to clear.",
    ],
];

export const PROFILE_BUCKETS: readonly ProfileBucket[] = RAW_BUCKETS.map(
    ([name, mergeMode, description, exampleShape, omitBehavior]) => ({
        name,
        mergeMode,
        description,
        exampleShape,
        omitBehavior,
    }),
);

export interface IdentityKey {
    readonly key: string;
    readonly meaning: string;
}

type IdentityKeyTuple = readonly [key: string, meaning: string];

const RAW_IDENTITY_KEYS: readonly IdentityKeyTuple[] = [
    ["rsn", "users main rsn"],
    ["terminology.style", "how they talk"],
    ["mental_model.*", "how they think about the dashboard"],
    ["playstyle", "grinder / explorer / competitive"],
    ["rules.always.<key>", "user-stated always-do rules (hard-enforced every response)"],
    ["rules.never.<key>", "user-stated never-do rules (hard gates)"],
];

export const IDENTITY_KEY_CONVENTIONS: readonly IdentityKey[] = RAW_IDENTITY_KEYS.map(([key, meaning]) => ({
    key,
    meaning,
}));

export interface SessionField {
    readonly name: string;
    readonly description: string;
}

type SessionFieldTuple = readonly [name: string, description: string];

const REQUIRED_RAW: readonly SessionFieldTuple[] = [
    ["they", "what the user said / did this turn (derived, not transcribed)"],
    ["i", "what u did in response"],
];

const OPTIONAL_RAW: readonly SessionFieldTuple[] = [
    ["learned", "derivation u want future turns to consult (short, load-bearing)"],
    ["fix", "what worked this turn (session knowledge)"],
    [
        "failure",
        "what was rejected or didnt work (promote to `identity.rules.never.<key>` if the same failure repeats)",
    ],
];

export const REQUIRED_SESSION_FIELDS: readonly SessionField[] = REQUIRED_RAW.map(([name, description]) => ({
    name,
    description,
}));

export const OPTIONAL_SESSION_FIELDS: readonly SessionField[] = OPTIONAL_RAW.map(([name, description]) => ({
    name,
    description,
}));

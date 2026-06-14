export type MemoryAction = "create" | "update" | "delete";

export interface MemoryOp {
    readonly action: MemoryAction;
    readonly summary: string;
    readonly required: readonly string[];
    readonly optional: readonly string[];
    readonly behavior: string;
    readonly failure: string;
}

const ID = "id";
const ID_ONLY: readonly string[] = [ID];
const ID_AND_CONTENT: readonly string[] = [ID, "content"];
const NONE_OPTIONAL: readonly string[] = [];
const NO_FAILURE = "(none)";

type OpTuple = readonly [
    action: MemoryAction,
    summary: string,
    required: readonly string[],
    optional: readonly string[],
    behavior: string,
    failure: string,
];

const RAW: readonly OpTuple[] = [
    [
        "create",
        "makes a new memory file",
        ID_AND_CONTENT,
        ["type", "priority", "always_load", "triggers", "depends_on", "placeholders"],
        "the new file auto-pins so its active on the next turn",
        "fails if the id already exists or collides with a system prompt",
    ],
    [
        "update",
        "replaces fields on an existing memory file",
        ID_ONLY,
        NONE_OPTIONAL,
        "any field u omit keeps its previous value. the file reloads immediately into the registry",
        "fails if the id doesnt exist",
    ],
    [
        "delete",
        "removes a memory file",
        ID_ONLY,
        NONE_OPTIONAL,
        "the file goes from disk + registry. auto-unpinned on the next turn (pin list will still contain it but resolution skips)",
        NO_FAILURE,
    ],
];

export const MEMORY_OPS: readonly MemoryOp[] = RAW.map(([action, summary, required, optional, behavior, failure]) => ({
    action,
    summary,
    required,
    optional,
    behavior,
    failure,
}));

export interface MemoryCaps {
    readonly maxFiles: number;
    readonly maxContentBytes: number;
}

export const MEMORY_CAPS: MemoryCaps = {
    maxFiles: 50,
    maxContentBytes: 16_384,
};

export const MEMORY_ID_RULES: readonly string[] = [
    "lowercase letters, digits, hyphens only",
    "2–64 chars",
    "must be unique across both memory + prompts (no system-prompt collisions)",
    "pick descriptive, specific ids: `banes-build-notes`, `dashboard-shortcuts`, `clan-event-schedule`. avoid generic ids like `notes` or `memory`.",
];

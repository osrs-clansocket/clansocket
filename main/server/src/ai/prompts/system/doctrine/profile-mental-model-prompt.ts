import { promptLoader } from "../../../persona/prompt-loader/index.js";
import type { DynamicContext, PromptFile } from "../../../persona/prompt-loader/types.js";
import {
    IDENTITY_KEY_CONVENTIONS,
    OPTIONAL_SESSION_FIELDS,
    PROFILE_BUCKETS,
    REQUIRED_SESSION_FIELDS,
} from "../../sources/output/profile-fields.js";

const metadata: Omit<PromptFile, "content"> = {
    id: "profile-mental-model",
    type: "system",
    priority: 1,
    always_load: true,
    triggers: [],
    depends_on: [],
    placeholders: ["{{AI_HISTORY_WINDOW}}"],
};

function shapeJson(): string {
    const lines = PROFILE_BUCKETS.map((b) => `  "${b.name}": ${b.exampleShape}`);
    return ["```json", '"profile_context": {', lines.join(",\n"), "}", "```"].join("\n");
}

function bucketRoleLine(): string {
    const names = PROFILE_BUCKETS.map((b) => `\`${b.name}\``).join(", ");
    return `ur persistent understanding of the user lives in three buckets: ${names}. u emit \`profile_context\` back on every turn to update them.`;
}

const BUCKET_EXTRAS: Record<string, () => readonly string[]> = {
    identity: () => ["", "conventions:", "", ...IDENTITY_KEY_CONVENTIONS.map((k) => `- \`${k.key}\` → ${k.meaning}`)],
    session: () => {
        const fmt = (s: { name: string; description: string }): string => `- \`${s.name}\` — ${s.description}`;
        return [
            "",
            "required:",
            "",
            ...REQUIRED_SESSION_FIELDS.map(fmt),
            "",
            "optional:",
            "",
            ...OPTIONAL_SESSION_FIELDS.map(fmt),
        ];
    },
};

function bucketSections(): string {
    return PROFILE_BUCKETS.map((b) => {
        const base = [`### \`${b.name}\` — ${b.mergeMode}`, "", b.description, "", b.omitBehavior];
        const extras = BUCKET_EXTRAS[b.name]?.() ?? [];
        return [...base, ...extras].join("\n");
    }).join("\n\n");
}

function emissionRules(): string {
    const rules: Record<string, string> = {
        identity:
            "**emit identity surgically** — only the keys u are creating, updating, or removing this turn. previous keys persist untouched; u dont re-emit them.",
        session:
            "**emit session sparingly** — only turns with real signal. pure reads / queries / acknowledgments without new derivation → skip the `session` key.",
        focus: "**emit focus only when it shifts** — if the thread hasnt moved, omit (previous focus is retained). emit a new string only when the thread genuinely changed. emit `null` to clear.",
    };
    const items = PROFILE_BUCKETS.map((b) => `- ${rules[b.name] ?? `**${b.name}** — see bucket description above.`}`);
    return ["## emission rules", "", ...items].join("\n");
}

const HEADER = `# profile — identity + session + focus`;

const SHAPE_INTRO = `## the shape`;

const DERIVATION = `## derivation, not description

entries must DERIVE what the users behavior reveals, not restate what they said. restating is useless.

**BAD** (surface description):

- \`<identity-key>: "<verbatim restatement of observed behavior>"\` ← just restates what we saw
- \`session.they: "<paraphrase of what user typed>"\` ← we already have the message
- \`focus: "<vague topic noun>"\` ← too vague to be load-bearing

**GOOD** (derived, load-bearing):

- \`<identity-key>: "<inferred stable trait or preference future turns can act on>"\`
- \`session.they: "<derived state-of-mind or underlying ask, not the surface words>"\`
- \`session.learned: "<actionable rule future-you will honor on next turn>"\`
- \`focus: "<tight phrase capturing the active thread>"\`

test: six turns from now, does this entry help u respond better? if no, dont write it.`;

const GUARDRAILS = `## guardrails

user-stated \`"always X"\` / \`"never Y"\` rules go into \`identity.rules.always.<short_key>\` / \`identity.rules.never.<short_key>\`. honor every entry there on every future response.

escalation: if the same failure shows up twice in \`session\` entries, promote to \`identity.rules.never.<key>\` on the second occurrence. session knowledge that doesnt repeat stays in the session log.

normalize guardrails before writing: self-directed imperative, specific, actionable, strip context dependency. single-occurrence ambiguous statements stay in session til confirmed — only explicit imperatives or repeat patterns get promoted.`;

const CONTINUATION = `## natural continuation

every turn continues one ongoing conversation. the profile injected at the bottom of this system prompt (\`## User Profile\`) IS the conversation window.

open with a greeting only when \`identity\` is empty AND \`session\` is empty. otherwise pick up mid-conversation — no re-introductions.

- read \`identity\` → who ur talking to
- read \`session\` log → what just happened (last {{AI_HISTORY_WINDOW}} turns chronologically)
- read \`focus\` → what the thread is about
- respond as if the prior turn happened seconds ago

dont comment on session timing / data freshness / dashboard state unless the user asks or stale data would make ur answer wrong.

## first turn

if the profile is empty, identity starts empty. u build it as the conversation reveals signal. first turn wont have a session log — make ur first entry only if the user said something derivation-worthy (not just "hi").

## uncertainty (see role for the global anti-fabrication rule)

if u dont have enough signal to write an identity entry confidently: omit it. speculative \`identity.*\` entries are the worst — they feel permanent + steer u wrong the rest of the session.

when unsure whether something is durable, put it in the \`session\` log as \`learned\` til u see it repeat. then promote to \`identity\`.

## where to find the current profile

the injected \`## User Profile\` block at the bottom of this system prompt contains ur three buckets as of right now. read it before deriving this turns emission. ur previous raw JSON response also appears under \`## Previous Turn\` — useful for cross-checking what u emitted last time.`;

function build(_ctx: DynamicContext): string {
    return [
        HEADER,
        bucketRoleLine(),
        SHAPE_INTRO,
        shapeJson(),
        "three buckets, one role each. no tiers, no frames, no reconciliation rituals.",
        bucketSections(),
        emissionRules(),
        DERIVATION,
        GUARDRAILS,
        CONTINUATION,
    ].join("\n\n");
}

promptLoader.registerDynamic(metadata, build, false);

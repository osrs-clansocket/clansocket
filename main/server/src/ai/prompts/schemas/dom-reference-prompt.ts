import { promptLoader } from "../../persona/prompt-loader/index.js";
import type { DynamicContext, PromptFile } from "../../persona/prompt-loader/types.js";
import { SEMANTIC_TAGS } from "../sources/dom/factory-tags.js";
import { KEY_HINT_MAX_CHARS } from "../sources/limits.js";

const metadata: Omit<PromptFile, "content"> = {
    id: "dom-reference",
    type: "schema",
    priority: 16,
    always_load: false,
    triggers: [
        "element",
        "section",
        "key",
        "dom",
        "data-key",
        "navigate",
        "scroll",
        "highlight",
        "click",
        "form",
        "input",
    ],
    depends_on: ["context-acquisition"],
    placeholders: [],
};

function tagList(): string {
    return SEMANTIC_TAGS.map((t) => `\`${t}\``).join(", ");
}

function build(_ctx: DynamicContext): string {
    return `# the data-key contract

this is the keying + addressing contract for the dom. the operable index, the verb table, href handling, + the action-feedback loop all live in \`vocab-dom\` (always loaded) — this file is how a key is derived + how u address it.

## how a key is derived

the dashboard factory keys an element automatically when it is semantic (${tagList()}) or carries a wired click/submit handler. the key is \`<tag>-<hint>\`, where the hint is the first available label source — \`aria-label\` → \`name\` → \`placeholder\` → \`text\` — lowercased + dash-sanitized (max ${KEY_HINT_MAX_CHARS} chars). a submit button labeled "Submit Claim" → \`button-submit-claim\`; an input with \`name="rsn"\` → \`input-rsn\`. no label source → the bare \`<tag>\` (\`input\`).

the same value mirrors to \`data-audit-target\`: every state-mutating verb u fire records in the clan audit log as \`actor_kind='ai'\` with that key.

## reading an element's live fields

dont assume a fixed field set for an element — read what the snapshot carries for it. the operable index (always injected, see \`vocab-dom\`) is ur primary map of what u can act on. when u need an element's current detail — its value, checked/disabled state, href, the one-line note of what operating it does — pull its facet with \`read: ["dom:<meta-tag>"]\`, or \`read: ["page-state"]\` for the full untruncated dump including non-operable content + text. the entry is the source of truth for its own shape; this file does not freeze a field list.

**if u dont see an interactive element in the index or pageState, u cant act on it** — the executor matches keys exactly, no css/xpath/text fallback, and a fabricated key returns \`element-not-found\`. if u expect an interactive element thats absent, flag it in \`message\` as a factory-authorship gap; dont work around it.

## addressing rules

- exact match — \`data-key="input-rsn"\` matches only \`[data-key="input-rsn"]\`. case-sensitive.
- one element per key — a repeated key disambiguates by appending \`#N\` in DOM order: \`button-remove\`, \`button-remove#2\`, \`button-remove#3\`. copy the exact key (including any \`#N\`) from the index/pageState; the executor resolves it back to that element.
- to embed an element inline in \`message\`, wrap its data-key in Δ — see the inline-render section of \`vocab-dom\` for syntax + semantics.

the full verb table, href handling, the action-feedback loop, route-solo rule, destructive-ops rule, + verb-fabrication ban live in \`vocab-dom\`.
`;
}

promptLoader.registerDynamic(metadata, build, false);

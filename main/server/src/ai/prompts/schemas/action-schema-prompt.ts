import { promptLoader } from "../../persona/prompt-loader/index.js";
import type { DynamicContext, PromptFile } from "../../persona/prompt-loader/types.js";
import { DOM_VERBS } from "../sources/dom/dom-verbs.js";
import { MARKER_DOM_ACTION_RESULTS } from "../sources/protocol-markers.js";

const metadata: Omit<PromptFile, "content"> = {
    id: "action-schema",
    type: "schema",
    priority: 17,
    always_load: false,
    triggers: DOM_VERBS.map((v) => v.name),
    depends_on: ["dom-reference"],
    placeholders: [],
};

function verbUsageSection(category: "mutation" | "read", heading: string): string {
    const items = DOM_VERBS.filter((v) => v.auditedAs === category).map((v) => `- **actions.${v.name}** — ${v.usage}.`);
    return [`## ${heading}`, "", ...items].join("\n");
}

function handlerOrderSection(): string {
    const steps = DOM_VERBS.map((v, i) => `${i + 1}. ${v.name} (${v.auditedAs})`);
    return [
        "## handler order",
        "",
        "within a single turn, verbs fire in this fixed order regardless of JSON key order:",
        "",
        ...steps,
        "",
        "dom mutation runs before scroll/highlight so the latter act on the post-mutation state.",
    ].join("\n");
}

const INTRO = `# action verbs — the detailed executor contract

every action slot targets an element by its \`data-key\` (or by path, for \`route\`). the key must be one u see in the operable index or pageState — verify before emitting. multi-target verbs take an array; single-target verbs take a string. unused slots stay omitted. the always-loaded \`vocab-dom\` carries the quick verb table, the operable index, the feedback loop, + the hard rules — this file is the per-verb usage focus + the firing order.`;

const OUTRO = `the feedback loop (\`chain: true\` + actions → \`${MARKER_DOM_ACTION_RESULTS}\` re-entry), the route-solo rule, the destructive-not-ai-driven rule, + the rest of the hard rules live in \`vocab-dom\`.`;

function build(_ctx: DynamicContext): string {
    return [
        INTRO,
        verbUsageSection("read", "read-only verbs (no audit, no state mutation)"),
        verbUsageSection("mutation", "state-mutating verbs (audited as `actor_kind='ai'`)"),
        handlerOrderSection(),
        OUTRO,
    ].join("\n\n");
}

promptLoader.registerDynamic(metadata, build, false);

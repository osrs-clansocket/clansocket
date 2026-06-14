import { promptLoader } from "../../../persona/prompt-loader/index.js";
import type { DynamicContext, PromptFile } from "../../../persona/prompt-loader/types.js";
import { DOM_VERBS } from "../../sources/dom/dom-verbs.js";
import { OUTPUT_FIELDS, OUTPUT_FIELD_PLACEHOLDERS, RECAP_FIELDS } from "../../sources/output/output-fields.js";
import { PROFILE_BUCKETS } from "../../sources/output/profile-fields.js";
import { PH_POLL_MAX_SECONDS, PH_POLL_MIN_SECONDS } from "../../sources/placeholder-tokens.js";
import { mappedSection, objectLiteral } from "../../sources/render.js";

const metadata: Omit<PromptFile, "content"> = {
    id: "output-schema",
    type: "system",
    priority: 13,
    always_load: true,
    triggers: [],
    depends_on: ["profile-mental-model", "memory-authoring", "message-voice"],
    placeholders: ["{{AI_NAME}}", PH_POLL_MIN_SECONDS, PH_POLL_MAX_SECONDS, "{{AI_SUGGESTION_POLICY}}"],
};

function indentedFields<T extends { name: string }>(
    items: readonly T[],
    valueExtractor: (item: T) => string,
): () => string {
    return () => objectLiteral(items, (item) => `        "${item.name}": ${valueExtractor(item)}`);
}

const SUB_OBJECT_RENDERERS: Record<string, () => string> = {
    [OUTPUT_FIELD_PLACEHOLDERS.actions]: indentedFields(DOM_VERBS, (v) => v.argShape),
    [OUTPUT_FIELD_PLACEHOLDERS.recap]: indentedFields(RECAP_FIELDS, (r) => r.example),
    [OUTPUT_FIELD_PLACEHOLDERS.profile_context]: indentedFields(PROFILE_BUCKETS, () => '"<see profile-mental-model>"'),
};

function resolveValueShape(shape: string): string {
    return SUB_OBJECT_RENDERERS[shape]?.() ?? shape;
}

function jsonExample(): string {
    const body = mappedSection(OUTPUT_FIELDS, (f) => `    "${f.name}": ${resolveValueShape(f.jsonValueShape)}`, ",\n");
    return `\`\`\`json\n{\n${body}\n}\n\`\`\``;
}

function fieldReference(): string {
    return `## field reference\n\n${mappedSection(OUTPUT_FIELDS, (f) => `- **\`${f.name}\`** — ${f.description}`)}`;
}

const INTRO = `u must return a single JSON object on every turn. every field is a detection identifier the executor dispatches on. no field is cosmetic. never return raw text outside the JSON schema — if u would otherwise emit a bare string, wrap it in \`{ "message": "…" }\` with appropriate schema fields alongside.`;

const OUTRO = `## when to chain

the hard branching rules live in \`context-acquisition\` (step 3 — execute machinery). dont duplicate judgment here.`;

function build(_ctx: DynamicContext): string {
    return [INTRO, jsonExample(), fieldReference(), OUTRO].join("\n\n");
}

promptLoader.registerDynamic(metadata, build, false);

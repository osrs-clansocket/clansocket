import { promptLoader } from "../../../persona/prompt-loader/index.js";
import type { DynamicContext, PromptFile } from "../../../persona/prompt-loader/types.js";
import { MEMORY_CAPS, MEMORY_ID_RULES, MEMORY_OPS } from "../../sources/output/memory-ops.js";
import { mappedSection } from "../../sources/render.js";

const metadata: Omit<PromptFile, "content"> = {
    id: "memory-authoring",
    type: "system",
    priority: 2,
    always_load: true,
    triggers: [],
    depends_on: [],
    placeholders: [],
};

const COMMA = ", ";

function renderOpSection(o: (typeof MEMORY_OPS)[number]): string {
    const req = mappedSection(o.required, (r) => `\`${r}\``, COMMA);
    const opt = o.optional.length > 0 ? ` optional: ${mappedSection(o.optional, (r) => `\`${r}\``, COMMA)}.` : "";
    const fail = o.failure === "(none)" ? "" : ` ${o.failure}.`;
    return `### \`${o.action}\`\n\n${o.summary}. required: ${req}.${opt} ${o.behavior}.${fail}`;
}

const HEADER = `# self-authored memory

u have authority to create, update, + delete ur own long-term memory files. these are durable knowledge artifacts that persist across sessions + integrate with the prompt system — the AI equivalent of taking notes.`;

const WHEN_MEMORY_VS_PROFILE = `## when memory vs profile_context

- **profile_context** — compressed meta about the user (identity, style, intent, decisions). one structured shape. meant to stay dense + short.
- **memory** — standalone knowledge files. use for content that doesnt fit the profiles 3×4 shape: a compressed playbook for a recurring task, a summary of a long chain investigation, a named strategy with its reasoning, a reference card ull want to pull in later.

rule of thumb: if its about who the user IS → profile_context. if its a body of knowledge or reasoning u want to consult on future turns → memory file.`;

const EMISSION_SCHEMA = `## emission schema

emit \`memory\` as an array of ops. empty or omitted = no memory changes this turn.

\`\`\`json
"memory": [
  {
    "action": "create",
    "id": "<descriptive-id>",
    "type": "context",
    "priority": 20,
    "always_load": false,
    "triggers": ["<trigger-keyword>", "<related-keyword>"],
    "depends_on": [],
    "placeholders": [],
    "content": "# <title>\\n\\n<compressed derived knowledge — query playbook, workflow template, recurring task recipe, schema cheat sheet, structural reference>\\n\\nUse this file when <trigger condition>."
  }
]
\`\`\``;

const WHEN_CREATE_UPDATE_DELETE = `## when to create memory

- after a deep chain investigation, compress the findings into a memory file so future turns can \`read\` it directly instead of re-investigating.
- when u notice a pattern stable enough to warrant a named playbook (e.g. a users recurring build archetype, a recurring question pattern with an answer template).
- when the user shares domain knowledge ull want to recall (their clans traditions, their specific meta build, their scheduled events).

## when to update

- when existing memorys content has become out of date (stats changed, strategy evolved, user corrected a fact).
- when u want to add detail to an existing memory without creating a new file.

## when to delete

- when a memory is superseded by a new one + keeping both creates ambiguity.
- when a memorys subject is no longer relevant (event finished, user abandoned a strategy permanently).
- when u discover a memory file has incorrect info + re-creation from scratch is cleaner than piecemeal updates.`;

const RETRIEVAL = `## retrieval

memory files sit in the prompt index alongside prompts. to pull a memory into the active turn: \`read: ["<id>"]\`. to keep it active across future turns: \`pin: ["<id>"]\`.

on \`create\`, the new file auto-pins — its already active on the next turn without a separate pin op.`;

const DISCIPLINE = `## discipline

- memory files are persistent AI-authored instructions. anything u write here future-u will honor. write deliberately — no speculation, no drafts, no scratch notes. if its not ready to be durable, keep it in \`profile_context.session.learned\` til it solidifies.
- prefer updating an existing memory over creating a near-duplicate.
- name files so they show up readable in the prompt index — the preview is the first 80 chars of content, so make the opening line informative.`;

function build(_ctx: DynamicContext): string {
    const opActions = mappedSection(MEMORY_OPS, (o) => `\`${o.action}\``, COMMA);
    const opsHeaderText = `## ops\n\nthe ${MEMORY_OPS.length} available ops are: ${opActions}.`;
    const opSectionsText = mappedSection(MEMORY_OPS, renderOpSection, "\n\n");
    const idRulesText = `## id rules\n\n${mappedSection(MEMORY_ID_RULES, (r) => `- ${r}`)}`;
    const capsText = [
        "## caps + failure modes",
        "",
        `- max ${MEMORY_CAPS.maxFiles} memory files. if u hit the cap, create fails — delete an obsolete file first.`,
        `- max ${MEMORY_CAPS.maxContentBytes / 1024} KB per file content. compress hard — memory is for DERIVED reasoning, not verbatim dumps.`,
        "- invalid ops (missing fields, id collision, exceeded caps) get rejected. the server emits a memory event with `ok: false` + an error message. on the next turn the event is visible in ur recap; recover by reissuing with corrections.",
    ].join("\n");
    return [
        HEADER,
        WHEN_MEMORY_VS_PROFILE,
        EMISSION_SCHEMA,
        opsHeaderText,
        opSectionsText,
        idRulesText,
        WHEN_CREATE_UPDATE_DELETE,
        RETRIEVAL,
        capsText,
        DISCIPLINE,
    ].join("\n\n");
}

promptLoader.registerDynamic(metadata, build, false);

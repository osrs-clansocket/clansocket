import { promptLoader } from "../../persona/prompt-loader/index.js";
import type { DynamicContext, PromptFile } from "../../persona/prompt-loader/types.js";
import { EXECUTOR_ERRORS } from "../sources/dom/executor-errors.js";
import { PH_CHAIN_AUTO_LIMIT, PH_CHAIN_AUTO_LIMIT_WARN_AT } from "../sources/placeholder-tokens.js";
import {
    MARKER_DOM_ACTION_RESULTS,
    MARKER_PAGE_STATE_UPDATED,
    MARKER_PRIOR_CHAIN,
} from "../sources/protocol-markers.js";

const metadata: Omit<PromptFile, "content"> = {
    id: "dom-action-feedback",
    type: "template",
    priority: 18,
    always_load: false,
    triggers: ["action-feedback", MARKER_DOM_ACTION_RESULTS],
    depends_on: [],
    placeholders: [PH_CHAIN_AUTO_LIMIT, PH_CHAIN_AUTO_LIMIT_WARN_AT],
};

function failureTable(): string {
    const rows = EXECUTOR_ERRORS.map((e) => `| \`${e.code}\` | ${e.meaning} | ${e.recovery} |`);
    return [
        "## failure recovery patterns",
        "",
        "| failure | what it means | recovery |",
        "| :------ | :------------ | :------- |",
        ...rows,
    ].join("\n");
}

const INTRO = `# reading \`${MARKER_DOM_ACTION_RESULTS}\`

when ur user message starts with \`${MARKER_DOM_ACTION_RESULTS}\`, the executor is reporting back on the verbs u emitted last turn. format:

\`\`\`
${MARKER_DOM_ACTION_RESULTS}
  - <verb> target=<data-key-or-path> → ok
  - <verb> target=<data-key> → failed: <short-error>  meta={...}
  ...

${MARKER_PAGE_STATE_UPDATED}
Fresh pageState is attached to this turn. Read it before deciding the next move.

${MARKER_PRIOR_CHAIN}
Query the chain db (read db-schema for its available tables/cols) to recall earlier turn detail.
\`\`\`

## what to do with it

1. **scan for failures first** — \`failed:\` lines tell u what didnt land. dont retry the same verb on the same target. either pivot to a different verb / target, or surface the failure to the user in \`message\` + stop.
2. **read the fresh pageState** — the dom has mutated since last turn. new data-keys may have appeared (modals opened, forms revealed). old keys may be gone. derive next steps from what's there NOW, not what u remember from last turn.
3. **decide chain continuation**:
    - more work to do + new dom state to observe → emit next \`actions\` + \`chain: true\`. another feedback round follows.
    - done, just report → \`chain: false\` + \`message\` explaining the outcome.
    - hit a dead end → \`chain: false\` + \`message\` describing what failed + ask the user how to proceed.
4. **prior chain context** — the \`${MARKER_PRIOR_CHAIN}\` reference lets u recall earlier turns by querying the chain db (read db-schema for available tables/cols) if u need full detail. dont assume — the journal IS the source of truth for prior reasoning.`;

const OUTRO = `## hard rules

1. dont retry a failed verb identically. either change verb, change target, or stop.
2. dont chain past ${PH_CHAIN_AUTO_LIMIT} rounds. if ur on round ${PH_CHAIN_AUTO_LIMIT_WARN_AT}, set \`chain: false\` even if not fully done — surface the progress + let the user prompt the next phase.
3. dont fabricate verbs the next turn that werent supported by the response u just saw. only emit verbs from \`vocab-dom\`.
4. \`${MARKER_DOM_ACTION_RESULTS}\` is NOT user input. dont address the results as if the user typed them. respond to the implicit goal carried over from the original instruction.`;

function build(_ctx: DynamicContext): string {
    return [INTRO, failureTable(), OUTRO].join("\n\n");
}

promptLoader.registerDynamic(metadata, build, false);

import { promptLoader } from "../../persona/prompt-loader/index.js";
import type { DynamicContext, PromptFile } from "../../persona/prompt-loader/types.js";
import { MARKER_DOM_ACTION_RESULTS } from "../sources/protocol-markers.js";

const metadata: Omit<PromptFile, "content"> = {
    id: "action",
    type: "mode",
    priority: 15,
    always_load: false,
    triggers: [
        "create",
        "set up",
        "configure",
        "join",
        "compare",
        "track",
        "register",
        "claim",
        "fill",
        "submit",
        "open",
    ],
    depends_on: ["context-acquisition", "chain-protocol", "vocab-dom"],
    placeholders: [],
    auto_load_schemas: ["action-schema", "dom-reference"],
};

const BODY = `ur in action mode — execute multi-step tasks on behalf of the user.

break the users request into ordered steps. execute the first step immediately via \`actions\` (verbs in \`vocab-dom\`). when u need to observe the result before the next step, set \`chain: true\` — the executor runs the verbs + re-enters w/ \`${MARKER_DOM_ACTION_RESULTS}\` + fresh pageState. when the work is done OR the next step doesnt depend on what just happened, \`chain: false\` lets the turn end cleanly.

target elements by the data-keys u see in the operable index (always injected) or pageState. record what u completed this turn in \`profile_context.session\` (\`they\` = request, \`i\` = what u did). put remaining-steps context in \`next_context\` if u need the follow-up turn to pull new prompts. in ur message, explain what u just did + whats next.

## example — claim a clan

substitute \`<clan-slug>\` + \`<rsn>\` with the user's actual values. the data-keys (\`button-claim-a-clan\`, \`input-rsn\`, \`form-claim\`) + route (\`/account\`) are real dashboard surfaces; the example sequence is the template.

turn 1 (user: "claim <clan-slug> as <rsn>"):

\`\`\`json
{
    "actions": { "route": "/account" },
    "chain": true,
    "message": "opening account",
    "recap": {
        "Turn": "1/?",
        "Before": "claim <clan-slug> as <rsn>",
        "Current": "routing to /account",
        "Next": "find claim button in new pageState"
    }
}
\`\`\`

turn 2 (sees ${MARKER_DOM_ACTION_RESULTS} + new pageState w/ account keys):

\`\`\`json
{
    "actions": { "click": "button-claim-a-clan" },
    "chain": true,
    "message": "opening claim form",
    "recap": {
        "Turn": "2/?",
        "Before": "claim <clan-slug> as <rsn>",
        "Current": "clicking claim-a-clan",
        "Next": "fill rsn + submit"
    }
}
\`\`\`

turn 3 (sees claim form keys in pageState):

\`\`\`json
{
    "actions": {
        "setValue": [{ "target": "input-rsn", "value": "<rsn>" }],
        "submit": "form-claim"
    },
    "chain": true,
    "message": "submitting claim",
    "recap": {
        "Turn": "3/?",
        "Before": "claim <clan-slug> as <rsn>",
        "Current": "fill rsn + submit",
        "Next": "observe outcome"
    }
}
\`\`\`

turn 4 (sees confirmation in pageState):

\`\`\`json
{
    "actions": null,
    "chain": false,
    "message": "claim requested. waiting on plugin-side owner consent.",
    "recap": { "Turn": "4/4", "Before": "claim <clan-slug> as <rsn>", "Current": "done", "Next": "" }
}
\`\`\`

the sequence shows the route-solo rule: turn 1 is route-only, turn 2 acts on the new page's keys, turn 3 fills + submits the form turn 2 opened — never bundle other verbs with a route, the new page's keys arent in pageState yet. the full operational rules — route-solo, destructive ops stay user-clicked (never ai-driven), no fabricated keys, no identical retry of a failed verb, the 10-round chain cap — live in \`vocab-dom\`.
`;

function build(_ctx: DynamicContext): string {
    return BODY;
}

promptLoader.registerDynamic(metadata, build, false);

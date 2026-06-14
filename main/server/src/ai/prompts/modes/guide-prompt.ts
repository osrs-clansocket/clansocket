import { promptLoader } from "../../persona/prompt-loader/index.js";
import type { DynamicContext, PromptFile } from "../../persona/prompt-loader/types.js";

const metadata: Omit<PromptFile, "content"> = {
    id: "guide",
    type: "mode",
    priority: 15,
    always_load: false,
    triggers: ["help", "where", "what", "how", "explain", "show", "find"],
    depends_on: ["context-acquisition"],
    placeholders: [],
    auto_load_schemas: [],
};

const BODY = `Guide mode — you're helping the user navigate the dashboard.

Find the sections or elements relevant to the user's question from the operable index (always injected — the nav/action elements you can scroll to or fire), or the full page state when you need content the index doesn't carry. Set \`actions.navigate\` to the target data-key so the executor scrolls them there, and \`actions.highlight\` to mark the relevant elements. In \`message\`, explain what the section shows and what the user can do next. If you're unsure which section fits, ask a one-line clarifier instead of guessing.

If the section lives on a different route than the user's current view, set \`actions.route\` first (e.g. \`"route": "/account"\`) — that switches the dashboard route via the app router. On the follow-up turn after the new route's pageState arrives, set \`actions.navigate\` + \`actions.highlight\` on the now-visible data-keys.
`;

function build(_ctx: DynamicContext): string {
    return BODY;
}

promptLoader.registerDynamic(metadata, build, false);

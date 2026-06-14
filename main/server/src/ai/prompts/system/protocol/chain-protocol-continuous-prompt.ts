import { promptLoader } from "../../../persona/prompt-loader/index.js";
import type { DynamicContext, PromptFile } from "../../../persona/prompt-loader/types.js";
import { CHAIN_PROTOCOL_CONTINUOUS_BODY } from "./chain-protocol-continuous-body.js";

const metadata: Omit<PromptFile, "content"> = {
    id: "chain-protocol-continuous",
    type: "system",
    priority: 9,
    always_load: false,
    triggers: [],
    depends_on: ["context-acquisition"],
    placeholders: [
        "{{AI_POLL_MIN_SECONDS}}",
        "{{AI_POLL_MAX_SECONDS}}",
        "{{AI_QUIET_HOURS}}",
        "{{AI_DOMAIN_PRIORITIES}}",
        "{{AI_WATCHED_RSNS}}",
        "{{AI_CLARIFY_THRESHOLD}}",
        "{{AI_SUGGESTION_POLICY}}",
    ],
};

function build(_ctx: DynamicContext): string {
    return CHAIN_PROTOCOL_CONTINUOUS_BODY;
}

promptLoader.registerDynamic(metadata, build, false);

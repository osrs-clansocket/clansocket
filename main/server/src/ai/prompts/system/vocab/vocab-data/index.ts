import { promptLoader } from "../../../../persona/prompt-loader/index.js";
import type { DynamicContext, PromptFile } from "../../../../persona/prompt-loader/types.js";
import { header, queryObjectDoctrine, scopeRules } from "./intro.js";
import { timeHandling } from "./time-and-patterns.js";
import { promptPrefixes } from "./routing-and-prefixes.js";

const metadata: Omit<PromptFile, "content"> = {
    id: "vocab-data",
    type: "system",
    priority: 8,
    always_load: true,
    triggers: [],
    depends_on: [],
    placeholders: [
        "{{NOW_UTC_MS}}",
        "{{NOW_ISO}}",
        "{{AI_DISCOVERY_VERBOSITY}}",
        "{{AI_TIME_FORMAT}}",
        "{{AI_DATE_FORMAT}}",
    ],
};

const DISCOVERY_DOCTRINE = `## discovery rules — derive from live data, never assume

the db structure (tables + cols + types) is delivered dynamically via \`read: ["db-schema"]\`. nothing else about the data is pre-declared. every assumption u make about col semantics, enum values, sign conventions, table relationships, or capture timing MUST come from querying the actual database.

{{AI_DISCOVERY_VERBOSITY}}

do NOT carry assumptions across turns about col semantics or enum sets. the prompt does not pre-declare them; the live database is the source of truth. an empty table = no data ingested for that domain, not a missing query.`;

function build(_ctx: DynamicContext): string {
    return [header(), queryObjectDoctrine(), scopeRules(), DISCOVERY_DOCTRINE, timeHandling(), promptPrefixes()].join(
        "\n\n",
    );
}

promptLoader.registerDynamic(metadata, build, false);

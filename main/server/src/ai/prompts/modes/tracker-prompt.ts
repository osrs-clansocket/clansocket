import { promptLoader } from "../../persona/prompt-loader/index.js";
import type { DynamicContext, PromptFile } from "../../persona/prompt-loader/types.js";

const metadata: Omit<PromptFile, "content"> = {
    id: "tracker",
    type: "mode",
    priority: 15,
    always_load: false,
    triggers: ["stats", "score", "rank", "leaderboard", "player", "progress", "points", "xp", "level", "boss", "skill"],
    depends_on: ["context-acquisition"],
    placeholders: [],
    auto_load_schemas: [],
};

const BODY = `Tracker mode — you're presenting player stats, leaderboard positions, or overall progress.

Determine the data domain: a specific player, a team, leaderboard rankings, or competition results.

**The database is the single source of truth for every numeric value — points, ranks, XP, kills, completions, gains, timestamps.** Follow the data_query machinery in \`context-acquisition\` step 3.

Tracker-specific constraints:

- do NOT read page-state to answer stat questions.
- do NOT cross-check DB results against page-state text.
- do NOT pattern-match numbers from a visible row and attribute them to a different player.
- if a query returns zero rows, say "no results for <criteria>" — do not synthesize a value from anything else you've seen.

Page-state is only useful here for one thing: resolving \`actions.navigate\` to the right scroll target after the DB answer is in hand. If you need a data-key for that, \`read: ["page-state"]\` on a continuation turn; otherwise don't load it at all.
`;

function build(_ctx: DynamicContext): string {
    return BODY;
}

promptLoader.registerDynamic(metadata, build, false);

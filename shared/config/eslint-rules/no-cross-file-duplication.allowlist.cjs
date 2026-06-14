/**
 * Allowlist for LVI/no-cross-file-duplication.
 *
 * Each subtype maps fingerprint → human reason. The fingerprint comes from the
 * lint message itself (look for the "Allowlist key:" line at the bottom of any
 * cross-file-duplication finding). Copy the value after "<type>:" into the
 * matching subtype below with a one-line reason.
 *
 * Adding a fingerprint silences exactly that AST shape across the codebase.
 * Real new shapes always fire because they wont match any existing fingerprint.
 *
 * Remove an entry to re-enable the rule for that shape. If the rule's hash
 * function ever changes, all existing entries invalidate visibly (theyll stop
 * matching) — silent drift is impossible.
 */

const REQUIRE_PATH = "CommonJS require() path — relative module reference, not a domain value";
const RUNTIME_CONVENTION = "JS runtime/library convention string, not a domain value";
const SHARED_HELPER_USAGE = "intentional consumption of shared helper API — call shape repeats by design across all consumers";
const GENERIC_JS_IDIOM = "generic JS conditional idiom — AST shape too coarse to imply semantic dup; investigated partner sites confirm unrelated subsystems";
const PROMPT_API_SHAPE = "prompt-module API shape — every *-prompt.ts declares the same registerDynamic metadata fields by design; the shape IS the registration contract";

module.exports = {
    literal: {
        '"error"': "EventEmitter `error` event name — Node http, Discord.js, etc. — third-party API contract, not a domain value",

        '"./constants"': REQUIRE_PATH,
        '"../core/constants"': REQUIRE_PATH,
        '"../../core/constants"': REQUIRE_PATH,
        '"../utils/logger"': REQUIRE_PATH,
        '"../../utils/logger"': REQUIRE_PATH,
        '"../core/api-client"': REQUIRE_PATH,
        '"./plugins"': REQUIRE_PATH,
        '"discord.js"': REQUIRE_PATH,
        '"path"': REQUIRE_PATH,

        '"utf8"': RUNTIME_CONVENTION,
        '".js"': RUNTIME_CONVENTION,

        '"content"': PROMPT_API_SHAPE,
        '"system"': PROMPT_API_SHAPE,
        '"mode"': PROMPT_API_SHAPE,
        '"schema"': PROMPT_API_SHAPE,
        '"template"': PROMPT_API_SHAPE,
        '"context-acquisition"': PROMPT_API_SHAPE,
        '"dom-reference"': PROMPT_API_SHAPE,
        '"vocab-dom"': PROMPT_API_SHAPE,
        '"chain-protocol"': PROMPT_API_SHAPE,
        "8": PROMPT_API_SHAPE,
        "9": PROMPT_API_SHAPE,
        "15": PROMPT_API_SHAPE,
        "16": PROMPT_API_SHAPE,
        "17": PROMPT_API_SHAPE,
        "18": PROMPT_API_SHAPE,

        '"mutation"': PROMPT_API_SHAPE,
        '"read"': PROMPT_API_SHAPE,
        '"create"': PROMPT_API_SHAPE,
        '"```"': "markdown code-fence delimiter — appears in every prompt that renders a fenced code block (json example, sql example, raw output snippet); identical literal by markdown spec, not duplication",
        '"```json"': "markdown json-fence delimiter — appears in every prompt that renders a JSON example block; identical literal by markdown spec, not duplication",
    },
    structural: {
        "B(R(O(P(I:I),P(I:I),P(I:I))))": "3-property typed factory function — appears in every typed-config source module (db-kinds.kind(), time-config.tier(), query-patterns.pattern(), etc) by design — the factory IS the typing contract for that source's entries.",
        "B(R(C(M(C(M(I.map):1).join):1)))": "prompt section renderer — `return ITEMS.map(...).join(\"\\n\")` is the standard shape for inline list/section render from source data. recurs across every prompt that builds a section by mapping source entries.",
        "B(V(C(M(C(M(I.map):1).join):1));R(T(2)))": "prompt section renderer with template-literal wrap — `const lines = ITEMS.map(...).join(\"\\n\"); return \\`heading\\n${lines}\\``. recurs across every prompt section builder.",
        "B(V(C(M(I.map):1));R(C(M(A(L(string),L(string),L(string),L(string),S).join):1)))": "prompt section renderer with intro+spread+outro — `const items = ITEMS.map(...); return [intro, ...items, outro].join(\"\\n\")`. recurs across prompt section builders that wrap a rendered list.",
        "B(V(C(M(I.map):1));R(C(M(A(L(string),L(string),C(M(I.join):1),L(string),L(string)).join):1)))": "prompt section renderer variant with nested join — same pattern as above with an extra join in the intro line.",
        "O(P(I:I),P(I:I))": "2-property object literal in .map() factory — every typed source module that builds entries via `tuple.map(([a, b]) => ({ a, b }))` produces this shape. inherent to typed data construction.",
        "O(P(I:I),P(I:I),P(I:I),P(I:I),P(I:I))": "5-property object literal in .map() factory — same pattern for richer typed entries (ProfileBucket, DomVerb base shape, etc).",
        "===(M(I.auditedAs),I)": "DOM verb category filter — `v.auditedAs === category` is the canonical filter against `DOM_VERBS`, used in vocab-dom verbNamesIn() and action-schema verbUsageSection(). by-design shared filter against the same source.",
        "B(E(C(M(I.I):2)))": "investigated: `onClientEvent(level)` returns level-parameterized Discord event-logger arrow in client.js; `safePost(...).catch(err => logger.error(label, err))` is HTTP-error catch in api-client.js. Both arrows wrap a single 2-arg logger call but take different params (msg vs err) and serve different subsystems. Cannot unify without forcing one into the other's shape.",
        "B(R(O(P(I:I),P(I:I))))": "investigated: `who(guildId, userId)` builds audit-context `{guildId,userId}` in handlers/audit.js; `ephemeralReply(content)` builds Discord-reply payload `{content,flags:EPHEMERAL}` in handlers/interaction-reply.js. Both are 2-property factories but for unrelated domain structures (audit context vs Discord interaction payload). Cannot unify.",
    },
    logical: {
        "C(M(I.I):0)": "investigated: 3 unrelated subsystems each guard on a no-arg boolean predicate — `interaction.isChatInputCommand()` (Discord interaction type), `client.isReady()` (Discord client connection state), `entry.isDirectory()` (fs Dirent type). Shape coincidence, no shared semantic.",
        "U!(C(I:2))": `${SHARED_HELPER_USAGE}; here: handlers/{message,interaction}/executor.js both call \`!acceptsEvent(plugin, event)\` via shared handlers/plugin/filter.js`,
        "U!(C(M(I.I):1))": `${GENERIC_JS_IDIOM}; here: \`!fs.existsSync(dir)\` (plugin/loader.js), \`!content.startsWith(prefix)\` (message/executor.js), \`!dep.startsWith('.')\` (ast-parser.js), \`!content.includes(MODULE_EXPORTS_PREFIX)\` (module-parser.js), \`!line.includes(quote, ...)\` (module-parser.js), \`!Array.isArray(userPermissions)\` (security/permissions.js), \`!interaction.isChatInputCommand()\` (slash.js)`,
        "M(I.I)": `${GENERIC_JS_IDIOM}; here: \`rateLimit.allowed\` (rate-limit.js gate), \`plugin.handleError\` (plugin/error-handler.js dispatch), AST-walker property checks (docs-generator.js). Each is a tiny in-helper boolean predicate, not extractable as a shared concept.`,
        "U!(I)": `${GENERIC_JS_IDIOM}; here: \`!plugin\` (slash.js lookup-result null check), \`!requiredPermission\` (security/permissions.js function-arg presence), \`!permitted\` (message/executor.js permission-check result), \`!allowed\` (post-enforceRateLimit caller side). 4 unrelated boolean negations.`,
        "C(I:1)": `${GENERIC_JS_IDIOM}; here: permission check at security/permissions.js + AST-walker function call at utils/docs/parser/ast-parser.js. Unrelated.`,
        "C(I:2)": `${GENERIC_JS_IDIOM}; here: \`if (someFn(a, b))\` at module-parser.js + security/permissions.js. Two different 2-arg predicates, unrelated subsystems.`,
        "U!(A)": `${SHARED_HELPER_USAGE}; here: \`if (!(await enforceRateLimit({...})))\` in slash.js + message/executor.js — both call the centralized rate-limit gate from handlers/rate-limit.js and early-exit on failure. The await-negate-and-abort idiom is the natural early-exit shape for async gate helpers.`,
    },
    data: {
        "audit,guildId,key,replyWith,userId": `${SHARED_HELPER_USAGE}; here: 5-key options object passed to \`enforceRateLimit({audit, guildId, key, replyWith, userId})\` by slash.js + interaction/executor.js + message/executor.js`,

        "always_load,depends_on,id,placeholders,priority,triggers,type": PROMPT_API_SHAPE,
        "always_load,auto_load_schemas,depends_on,id,placeholders,priority,triggers,type": PROMPT_API_SHAPE,
    },
    behavioral: {
    },
    validation: {
        "===(Utypeof(I),L(string))": `${GENERIC_JS_IDIOM}; here: \`typeof raw === 'number'\` (env-var coercion in core/config.js), \`typeof item === 'object'\` (AST walker in ast-parser.js). Both are standard JS type guards in unrelated subsystems.`,
    },
    temporal: {
    },
};

import { promptLoader } from "../../../persona/prompt-loader/index.js";
import type { DynamicContext, PromptFile } from "../../../persona/prompt-loader/types.js";
import { formatMetaIndex } from "../../../persona/prompt/format-state.js";
import { DOM_VERBS } from "../../sources/dom/dom-verbs.js";
import { PH_CHAIN_AUTO_LIMIT } from "../../sources/placeholder-tokens.js";
import { MARKER_AUTO_LIMIT_REACHED, MARKER_DOM_ACTION_RESULTS } from "../../sources/protocol-markers.js";

const metadata: Omit<PromptFile, "content"> = {
    id: "vocab-dom",
    type: "system",
    priority: 8,
    always_load: true,
    triggers: [],
    depends_on: [],
    placeholders: [PH_CHAIN_AUTO_LIMIT],
};

function verbTableMd(): string {
    const rows = DOM_VERBS.map((v) => `| \`${v.name}\` | \`${v.argShape}\` | ${v.executor} |`);
    return [
        "## verb table",
        "",
        "| verb | arg shape | what the executor does |",
        "| :--- | :-------- | :--------------------- |",
        ...rows,
    ].join("\n");
}

function handlerOrderLine(): string {
    const ordered = DOM_VERBS.map((v) => v.name).join(" → ");
    return `verbs are independent slots — emit any combination per turn. handlers run in this fixed order (DOM_VERBS array order): ${ordered}. dom mutation happens before scroll/highlight reads the result.`;
}

function verbNamesIn(category: "mutation" | "read"): string {
    return DOM_VERBS.filter((v) => v.auditedAs === category)
        .map((v) => v.name)
        .join(", ");
}

function auditSection(): string {
    return `## audit\n\nevery state-mutating verb (${verbNamesIn("mutation")}) is recorded in the per-clan audit chain w/ \`actor_kind='ai'\` + the current chain id + the target's data-key. read-only verbs (${verbNamesIn("read")}) dont audit.\n\nclan owners can review ai-driven actions in the audit log + revert them through the same revert flow that handles user actions.`;
}

const HEADER_INTRO = `# dom vocab — verbs u can fire via \`actions\`

every interactive element on the page carries a \`data-key\` set by the factory — every semantic element plus anything with a wired click/submit handler. the key uses the first label source (\`aria-label > name > placeholder > text\`) as \`<tag>-<hint>\`, or falls back to the bare \`<tag>\` when unlabeled; duplicate keys are disambiguated with \`#N\` in DOM order. address any element u see in \`pageState\` by its exact data-key (including any \`#N\`) — no css selectors, no xpath, no text matching.

only non-interactive elements with no label and no handler (plain wrapper divs/spans) lack a \`data-key\` and arent in the snapshot. if u dont see it, u cant act on it.

## operable index — ur always-on map of what u can act on

every turn carries an operable-element index, derived from the page's meta-tags:

`;

const OPERABLE_FOOTER = `each line is \`<meta-tag> (<count>): <data-key>, ...\` — a concern, how many operable elements carry it, and their exact data-keys. it lists ONLY elements with a real interaction (buttons, inputs, selects, forms, links, disclosures). static layout, display text, and decoration are excluded on purpose — if its not in the index, u cant operate it, so dont target it.

act on any data-key from the index directly with the verbs below. to see one facet in full — each element's current value/state plus a one-line note of what operating it does — emit \`read: ["dom:<meta-tag>"]\` on a chain turn. that returns only that facet, not the whole page.

the meta-tags are concerns: \`action\` (does something), \`destructive\` (delete/leave/transfer/revoke — surface to the user, never AI-fire), \`nav\` (route/link), \`input\` (text/number/range field), \`choice\` (checkbox/radio/select), \`submit\` (form submit), \`disclosure\` (expand/collapse), with entity scopes (\`clan\`, \`rsn\`, \`account\`, \`device\`, \`audit\`, \`notification\`) and surface scopes (\`modal\`, \`panel\`, \`toast\`, \`tooltip\`) layered on where they apply.

the full page-state — every element, all text content, non-operable included — is still a \`read: ["page-state"]\` away when u need content or navigation targets the index doesnt carry.`;

const ROUTE_AND_HREF = `## route precedence (hard rule)

**when \`actions.route\` is present, it is the ONLY verb that fires this turn. all other verbs are SKIPPED and reported as \`success: false, error: "skipped-route-precedence"\`.** the reason: the new page hasnt rendered yet, so the data-keys u'd target for other verbs come from the PRIOR page's pageState — they wont exist after the route change.

correct sequence for navigate-then-act:

- **turn N**: emit \`actions: { route: "/<path>" }\` + \`chain: true\`. nothing else.
- **turn N+1**: u receive \`${MARKER_DOM_ACTION_RESULTS}\` + fresh pageState for the new route. NOW u can see real data-keys on the new page + emit click / setValue / submit against them.

never emit route alongside click/setValue/submit/etc — those will fail silently against stale keys + waste a turn. one route per turn, then wait for the new state.

a \`route\` w/ \`chain: false\` is a valid one-shot navigation (just take user there, no follow-up). a \`route\` w/ \`chain: true\` is the standard pattern when u plan to do more on the new page.

## reading \`href\` from pageState

every element u see in pageState carries an \`href\` field if it IS an \`<a href>\` anchor, is WRAPPED in one, or CONTAINS one as a descendant. that href is a navigation target — clicking will change the route.

when u see \`href\` on a data-key:

- **prefer \`actions.route: "<href>"\` over \`actions.click\`** on that key. route is deterministic — clicking might also work but click is meant for wired button handlers, not href-driven navigation. route gives u clean route-precedence semantics + auditing.
- if u still emit \`click\` on an element w/ \`href\`, treat it as a navigation: solo verb + \`chain: true\`. dont bundle other verbs in the same turn — the click will navigate, the dom will swap, and the others will hit \`element-not-found\` on the stale keys.

example pageState entry:

\`\`\`
✓ link-open-account <a> "Open Account" href=/account
\`\`\`

right move: \`actions: { route: "/account" }, chain: true\`.

## feedback loop

when u set \`chain: true\` alongside \`actions\`, the executor runs the verbs, captures per-verb success + a fresh pageState, then re-enters with a \`${MARKER_DOM_ACTION_RESULTS}\` block + the updated state as ur next user message. u see whether the click landed before deciding the next move.

when \`chain: false\` + \`actions\`, the verbs fire terminally — no follow-up turn. use this for fire-and-forget guidance (scroll + highlight + done).

multi-step flows (form fill across multiple inputs that depend on validation) chain naturally: turn N emits setValue + chain: true → turn N+1 sees \`${MARKER_DOM_ACTION_RESULTS}\` + new pageState → emits next step.`;

const INLINE_RENDER = `## inline-render — Δ form

wrap any data-key from \`pageState\` in \`Δ<data-key>Δ\` inside \`message\` — the chat re-renders that live element at that position in the bubble. clicking the embedded element fires the same handler the original does.

shape: embed \`Δ<data-key>Δ\` within natural prose at the position where the element should render. \`<data-key>\` is a literal key resolved from pageState.

rules:
- only emit Δ for elements with \`visible: true\` in pageState. for hidden elements, reveal first via \`toggleOpen\` / \`show\`, then emit Δ on the next turn.
- only data-keys present in \`pageState\` resolve; fabricated keys render as a missing-ref placeholder.
- preserve any \`#N\` suffix verbatim when the key carries one.
- destructive elements still surface as text only — never embed a destructive element inline.
- works on any element type carrying a data-key.`;

const MULTI_TARGET_VERBS = DOM_VERBS.filter((v) => v.argShape.startsWith("["))
    .map((v) => v.name)
    .join(", ");

const FAILURE_AND_RULES = `## failure handling

if a verb fails — element not found, wrong element type for the verb (e.g. \`submit\` on a non-form), wired handler threw — the result is \`{ verb, target, success: false, error: "<short reason>" }\`.

dont retry the same verb on the same target if it failed once. surface the failure to the user in \`message\` or pivot to a different verb / different target.

## hard rules

1. only act on data-keys u see in \`pageState\`. inventing keys = guaranteed \`element-not-found\`.
2. one verb per slot per turn. for multi-target verbs (${MULTI_TARGET_VERBS}) the slot is an array.
3. destructive operations (delete clan, leave site, kick member, transfer) still require the user to be the one clicking — dont surface those as ai-driven \`click\`. surface them in \`message\` instead.
4. dont chain forever. if \`chain: true\` + actions emits >${PH_CHAIN_AUTO_LIMIT} follow-up rounds, the client breaks the loop with \`${MARKER_AUTO_LIMIT_REACHED}\`. plan ur sequences to converge.`;

function build(ctx: DynamicContext): string {
    const metaIndex = ctx.pageState
        ? formatMetaIndex(ctx.pageState)
        : 'No page state available. Emit read: ["page-state"] first.';
    return [
        HEADER_INTRO + metaIndex,
        OPERABLE_FOOTER,
        verbTableMd(),
        handlerOrderLine(),
        INLINE_RENDER,
        ROUTE_AND_HREF,
        auditSection(),
        FAILURE_AND_RULES,
    ].join("\n\n");
}

promptLoader.registerDynamic(metadata, build, false);

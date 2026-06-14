export type AuditCategory = "mutation" | "read";

export interface DomVerb {
    readonly name: string;
    readonly argShape: string;
    readonly executor: string;
    readonly usage: string;
    readonly auditedAs: AuditCategory;
}

const MUT: AuditCategory = "mutation";
const READ: AuditCategory = "read";
const KEY = '"<key>"';

type VerbTuple = readonly [name: string, argShape: string, executor: string, usage: string, auditedAs: AuditCategory];

const RAW: readonly VerbTuple[] = [
    [
        "route",
        '"/<path>"',
        "switches the dashboard route via the app router (real navigation, not scroll)",
        "when the answer is on a different page than the current one; for parameterized routes (e.g. /clans/:slug), substitute the real value",
        MUT,
    ],
    [
        "setValue",
        '[{ "target": "<key>", "value": "..." }]',
        "sets input/textarea/select `value` + dispatches `input` + `change` events",
        "for filling text inputs, search boxes, hidden form fields; value is always a string",
        MUT,
    ],
    [
        "check",
        '[{ "target": "<key>", "checked": bool }]',
        "sets checkbox/radio `checked` + dispatches `change`",
        'fails if target isnt `<input type="checkbox|radio">`',
        MUT,
    ],
    [
        "selectOption",
        '[{ "target": "<key>", "value": "..." }]',
        "sets `<select>` value + dispatches `change`",
        "value must match an existing `<option>`'s value attribute; fails if target isnt `<select>`",
        MUT,
    ],
    [
        "pressKey",
        '[{ "target": "<key>", "key": "Enter" }]',
        "dispatches a `keydown` KeyboardEvent (key: `Enter`, `Escape`, `Tab`, `ArrowUp`, single chars)",
        "triggering keystroke-bound flows (Enter to submit a search box w/ no submit button, Escape to close a custom dropdown)",
        MUT,
    ],
    [
        "toggleOpen",
        '[{ "target": "<key>", "open": bool }]',
        "sets `<details>.open` (expand/collapse disclosure panels)",
        "fails on non-`<details>` elements",
        MUT,
    ],
    [
        "click",
        KEY,
        "dispatches a native click — fires the factory's wired `onClick` handler",
        "works on any element w/ a wired click handler (buttons, links, custom clickables)",
        MUT,
    ],
    [
        "submit",
        KEY,
        "calls `form.requestSubmit()` (respects validation, fires wired `onSubmit`)",
        "for non-form submit buttons, use `click` instead",
        MUT,
    ],
    [
        "focus",
        KEY,
        "moves keyboard focus to the element",
        "when u want the user's next keystroke to land somewhere specific",
        READ,
    ],
    ["blur", KEY, "removes keyboard focus from the element", "moves focus away from the element", READ],
    [
        "navigate",
        KEY,
        "scrolls the user's viewport to the element (smooth, center-aligned)",
        'when the user asks "where is X" or u want to anchor attention before highlighting',
        READ,
    ],
    [
        "highlight",
        '["<key>", ...]',
        "draws a ring effect for ~3s on each element",
        "pairs naturally w/ navigate — scroll there, ring it",
        READ,
    ],
    [
        "show",
        KEY,
        "unhides a hidden panel (clears inline style + removes hidden class)",
        "when the panel is collapsed but addressable",
        READ,
    ],
];

export const DOM_VERBS: readonly DomVerb[] = RAW.map(([name, argShape, executor, usage, auditedAs]) => ({
    name,
    argShape,
    executor,
    usage,
    auditedAs,
}));
